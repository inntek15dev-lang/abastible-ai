// IEEE Trace: REQ-010 | US-010 | pages/compromisos/CompromisoList.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { CheckCircle, Clock, AlertCircle, Calendar, User, Edit, X, Save, Shield, Trash2, TrendingUp, Download, FileText, Filter, CheckSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateExecutiveCompromisosPDF } from '../../utils/compromisosPdfReport';
import './CompromisoList.css';

export default function CompromisoList() {
    const [searchParams] = useSearchParams();
    const [compromisos, setCompromisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    // Hierarchy Filters
    const [contratistas, setContratistas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [vinculaciones, setVinculaciones] = useState([]);

    const [selectedContratista, setSelectedContratista] = useState('');
    const [selectedServicio, setSelectedServicio] = useState('');
    const [selectedDependencia, setSelectedDependencia] = useState('');
    const [selectedResponsabilidad, setSelectedResponsabilidad] = useState('');
    const [contratoNumero, setContratoNumero] = useState('');

    // Period Filters
    const [fechaCreacionDesde, setFechaCreacionDesde] = useState('');
    const [fechaCreacionHasta, setFechaCreacionHasta] = useState('');
    const [fechaCompromisoDesde, setFechaCompromisoDesde] = useState('');
    const [fechaCompromisoHasta, setFechaCompromisoHasta] = useState('');

    const hallazgoId = searchParams.get('hallazgo');
    const { user, isAdmin } = useAuth();
    const isAdminOrADC = isAdmin || user?.role === 'administrador_contrato';

    // Edit Modal State
    const [editingCompromiso, setEditingCompromiso] = useState(null);
    const [evidenceFiles, setEvidenceFiles] = useState({});
    const [evidenceComments, setEvidenceComments] = useState({});
    const [uploadingCompromisoId, setUploadingCompromisoId] = useState(null);
    const [editForm, setEditForm] = useState({
        descripcion: '',
        fecha_compromiso: '',
        responsabilidad: 'contratista'
    });

    useEffect(() => {
        const loadResult = async () => {
            try {
                const [contRes, servRes, depRes, vincRes] = await Promise.all([
                    api.get('/contratistas'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/resources/dependencias'),
                    api.get('/vinculaciones')
                ]);
                setContratistas(contRes.data.data || []);
                setServicios(servRes.data.data || []);
                setDependencias(depRes.data.data || []);
                setVinculaciones(vincRes.data.data || []);
            } catch (err) {
                console.error("Error loading filters", err);
            }
        };
        loadResult();
    }, []);

    useEffect(() => {
        fetchCompromisos();

        if (selectedContratista && selectedServicio && selectedDependencia) {
            const match = vinculaciones.find(v =>
                String(v.contratista_id) === String(selectedContratista) &&
                String(v.servicio_id) === String(selectedServicio) &&
                String(v.dependencia_id) === String(selectedDependencia)
            );
            setContratoNumero(match ? match.numero_contrato : '');
        } else {
            setContratoNumero('');
        }
    }, [
        filter,
        selectedContratista,
        selectedServicio,
        selectedDependencia,
        selectedResponsabilidad,
        fechaCreacionDesde,
        fechaCreacionHasta,
        fechaCompromisoDesde,
        fechaCompromisoHasta
    ]);

    const fetchCompromisos = async () => {
        try {
            setLoading(true);
            let params = {};
            if (filter === 'vencidos') params.vencidos = 'true';
            else if (filter !== 'all') params.estado = filter;

            if (hallazgoId) params.hallazgo_id = hallazgoId;
            if (selectedContratista) params.contratista_id = selectedContratista;
            if (selectedServicio) params.servicio_id = selectedServicio;
            if (selectedDependencia) params.dependencia_id = selectedDependencia;
            if (selectedResponsabilidad) params.responsabilidad = selectedResponsabilidad;

            if (fechaCreacionDesde) params.fecha_creacion_desde = fechaCreacionDesde;
            if (fechaCreacionHasta) params.fecha_creacion_hasta = fechaCreacionHasta;
            if (fechaCompromisoDesde) params.fecha_compromiso_desde = fechaCompromisoDesde;
            if (fechaCompromisoHasta) params.fecha_compromiso_hasta = fechaCompromisoHasta;

            const response = await api.get('/compromisos', { params });
            setCompromisos(response.data.data || []);
        } catch (err) {
            setError('Error al cargar compromisos');
        } finally {
            setLoading(false);
        }
    };

    // Filter logic for dropdowns
    const filteredServicios = useMemo(() => {
        if (!selectedContratista) return servicios;
        const validServiceIds = new Set(vinculaciones
            .filter(v => String(v.contratista_id) === String(selectedContratista))
            .map(v => v.servicio_id));
        return servicios.filter(s => validServiceIds.has(s.id));
    }, [selectedContratista, vinculaciones, servicios]);

    const filteredDependencias = useMemo(() => {
        if (!selectedContratista && !selectedServicio) return dependencias;
        let filteredVincs = vinculaciones;
        if (selectedContratista) filteredVincs = filteredVincs.filter(v => String(v.contratista_id) === String(selectedContratista));
        if (selectedServicio) filteredVincs = filteredVincs.filter(v => String(v.servicio_id) === String(selectedServicio));

        const validDepIds = new Set(filteredVincs.map(v => v.dependencia_id));
        return dependencias.filter(d => validDepIds.has(d.id));
    }, [selectedContratista, selectedServicio, vinculaciones, dependencias]);

    const isVencido = (fechaCompromiso, estado) => {
        if (estado === 'cumplido') return false;
        if (estado === 'vencido') return true;
        if (!fechaCompromiso) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateComp = new Date(fechaCompromiso);
        return dateComp < today;
    };

    const handleCumplir = async (id) => {
        const observacion = prompt('Observación de cumplimiento (opcional):');
        try {
            await api.patch(`/compromisos/${id}/cumplir`, { observacion_cumplimiento: observacion });
            fetchCompromisos();
        } catch (err) {
            setError('Error al marcar como cumplido');
        }
    };

    const handleUploadEvidence = async (compId) => {
        const file = evidenceFiles[compId];
        const comment = evidenceComments[compId];

        if (!file) {
            alert('Por favor seleccione un archivo de evidencia');
            return;
        }

        setUploadingCompromisoId(compId);
        try {
            const formData = new FormData();
            formData.append('evidencia', file);
            if (comment) {
                formData.append('comentario_evidencia', comment);
            }

            await api.patch(`/compromisos/${compId}/evidencia`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('Evidencia cargada con éxito');
            fetchCompromisos();
            setEvidenceFiles(prev => { const updated = { ...prev }; delete updated[compId]; return updated; });
            setEvidenceComments(prev => { const updated = { ...prev }; delete updated[compId]; return updated; });
        } catch (err) {
            console.error('Error uploading evidence:', err);
            alert(err.response?.data?.message || 'Error al cargar evidencia');
        } finally {
            setUploadingCompromisoId(null);
        }
    };

    const handleEditClick = (comp) => {
        setEditingCompromiso(comp);
        setEditForm({
            descripcion: comp.descripcion,
            fecha_compromiso: comp.fecha_compromiso ? comp.fecha_compromiso.split('T')[0] : '',
            responsabilidad: comp.responsabilidad || 'contratista'
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/compromisos/${editingCompromiso.id}`, editForm);
            setEditingCompromiso(null);
            fetchCompromisos();
        } catch (err) {
            alert('Error al actualizar compromiso');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este compromiso?')) return;
        try {
            await api.delete(`/compromisos/${id}`);
            fetchCompromisos();
        } catch (err) {
            setError('Error al eliminar compromiso');
        }
    };

    // Export CSV Function
    const handleExportCSV = () => {
        if (!compromisos || compromisos.length === 0) {
            alert('No hay compromisos para exportar');
            return;
        }

        const headers = [
            'ID',
            'Empresa Contratista',
            'Servicio',
            'Dependencia',
            'Marca Responsabilidad',
            'Descripción',
            'Fecha Creación',
            'Fecha Compromiso',
            'Estado',
            'Registrado Por',
            'Responsable Cierre',
            'Fecha Cumplimiento'
        ];

        const rows = compromisos.map(c => [
            c.id,
            c.registro?.eecc_nombre || 'N/A',
            c.registro?.servicio_nombre || 'N/A',
            c.registro?.dependencia_nombre || 'N/A',
            (c.responsabilidad || 'contratista').toUpperCase(),
            `"${(c.descripcion || '').replace(/"/g, '""')}"`,
            c.created_at ? new Date(c.created_at).toLocaleDateString('es-CL') : 'N/A',
            c.fecha_compromiso ? new Date(c.fecha_compromiso).toLocaleDateString('es-CL') : 'N/A',
            isVencido(c.fecha_compromiso, c.estado) ? 'VENCIDO' : c.estado.toUpperCase(),
            c.creadoPor?.name || c.responsable?.name || 'N/A',
            c.responsableCierre?.name || (c.estado === 'cumplido' ? 'Administrador' : '-'),
            c.fecha_cumplimiento ? new Date(c.fecha_cumplimiento).toLocaleDateString('es-CL') : '-'
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte_Compromisos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export PDF Function
    const handleExportPDF = async () => {
        if (!compromisos || compromisos.length === 0) {
            alert('No hay compromisos para exportar');
            return;
        }

        const activeFilters = {
            empresa: selectedContratista ? (contratistas.find(c => String(c.id) === String(selectedContratista))?.razon_social || 'Todas') : 'Todas',
            servicio: selectedServicio ? (servicios.find(s => String(s.id) === String(selectedServicio))?.nombre || 'Todos') : 'Todos',
            dependencia: selectedDependencia ? (dependencias.find(d => String(d.id) === String(selectedDependencia))?.nombre || 'Todas') : 'Todas',
            responsabilidad: selectedResponsabilidad ? (selectedResponsabilidad === 'abastible' ? 'Abastible' : 'Contratista') : 'Todas',
            contrato: contratoNumero || 'Todos',
            estado: filter === 'all' ? 'Todos' : filter.toUpperCase().replace('_', ' '),
            periodoCreacion: (fechaCreacionDesde || fechaCreacionHasta) ? `${fechaCreacionDesde || 'Inicio'} al ${fechaCreacionHasta || 'Hoy'}` : 'Todo el Histórico',
            periodoCompromiso: (fechaCompromisoDesde || fechaCompromisoHasta) ? `${fechaCompromisoDesde || 'Inicio'} al ${fechaCompromisoHasta || 'Hoy'}` : 'Todo el Histórico'
        };

        try {
            await generateExecutiveCompromisosPDF(compromisos, user, activeFilters);
        } catch (err) {
            console.error('Error al generar PDF de compromisos:', err);
            alert('Ocurrió un error al generar el reporte PDF. Por favor intente nuevamente.');
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'cumplido': return <CheckCircle className="text-success" size={18} />;
            case 'vencido': return <AlertCircle className="text-danger" size={18} />;
            case 'en_proceso': return <Clock className="text-info" size={18} />;
            default: return <Clock className="text-warning" size={18} />;
        }
    };

    if (loading && compromisos.length === 0) return <div className="loading">Cargando compromisos...</div>;

    return (
        <div className="compromisos-page">
            {/* 1. Header & Title Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#003594', color: 'white', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="page-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Gestión de Compromisos</h1>
                        <p className="page-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Seguimiento y control de acciones de mejora</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {contratoNumero && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '8px', color: '#1e40af' }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', color: '#60a5fa' }}>Contrato N°</span>
                            <span style={{ fontSize: '1rem', fontWeight: 700 }}>{contratoNumero}</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            borderRadius: '8px', background: '#10b981', color: 'white', border: 'none',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Download size={16} /> Exportar CSV
                    </button>
                    <button
                        type="button"
                        onClick={handleExportPDF}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            borderRadius: '8px', background: '#003594', color: 'white', border: 'none',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                    >
                        <FileText size={16} /> Exportar PDF
                    </button>
                </div>
            </div>

            {/* 2. Hierarchy Filters (Horizontal) */}
            <div className="filter-section-container">
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={16} style={{ color: '#ff6600' }} /> Filtros de Estructura Organizacional
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', width: '100%' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Empresa Contratista</label>
                        <select
                            className="form-control"
                            value={selectedContratista}
                            onChange={(e) => { setSelectedContratista(e.target.value); setSelectedServicio(''); setSelectedDependencia(''); }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="">Todas las Empresas</option>
                            {contratistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Servicio</label>
                        <select
                            className="form-control"
                            value={selectedServicio}
                            onChange={(e) => { setSelectedServicio(e.target.value); setSelectedDependencia(''); }}
                            disabled={!selectedContratista}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="">Todos los Servicios</option>
                            {filteredServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Dependencia</label>
                        <select
                            className="form-control"
                            value={selectedDependencia}
                            onChange={(e) => setSelectedDependencia(e.target.value)}
                            disabled={!selectedServicio}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="">Todas las Dependencias</option>
                            {filteredDependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Marca de Responsabilidad</label>
                        <select
                            className="form-control"
                            value={selectedResponsabilidad}
                            onChange={(e) => setSelectedResponsabilidad(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="">Todas las Responsabilidades</option>
                            <option value="contratista">Contratista</option>
                            <option value="abastible">Abastible</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Period & Status Filters */}
            <div className="filter-section-container">
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} style={{ color: '#003594' }} /> Filtro por Período y Estado
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', width: '100%' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Fecha Creación (Desde)</label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaCreacionDesde}
                            onChange={(e) => setFechaCreacionDesde(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Fecha Creación (Hasta)</label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaCreacionHasta}
                            onChange={(e) => setFechaCreacionHasta(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Fecha Compromiso (Desde)</label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaCompromisoDesde}
                            onChange={(e) => setFechaCompromisoDesde(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Fecha Compromiso (Hasta)</label>
                        <input
                            type="date"
                            className="form-control"
                            value={fechaCompromisoHasta}
                            onChange={(e) => setFechaCompromisoHasta(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                {/* Status Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <div className="filter-tabs">
                        {[
                            { id: 'all', label: 'TODOS', color: null },
                            { id: 'pendiente', label: 'PENDIENTE', color: '#f59e0b' },
                            { id: 'en_proceso', label: 'EN PROCESO', color: '#3b82f6' },
                            { id: 'cumplido', label: 'CUMPLIDO', color: '#10b981' },
                            { id: 'vencidos', label: 'VENCIDO', color: '#ef4444' }
                        ].map((f) => (
                            <button
                                key={f.id}
                                className={`filter-tab ${filter === f.id ? 'active' : ''}`}
                                onClick={() => setFilter(f.id)}
                                style={{
                                    color: filter === f.id ? (f.color || '#1e293b') : '#64748b',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {(fechaCreacionDesde || fechaCreacionHasta || fechaCompromisoDesde || fechaCompromisoHasta || selectedContratista || selectedResponsabilidad) && (
                        <button
                            type="button"
                            onClick={() => {
                                setFechaCreacionDesde('');
                                setFechaCreacionHasta('');
                                setFechaCompromisoDesde('');
                                setFechaCompromisoHasta('');
                                setSelectedContratista('');
                                setSelectedServicio('');
                                setSelectedDependencia('');
                                setSelectedResponsabilidad('');
                                setFilter('all');
                            }}
                            style={{
                                background: '#f1f5f9', border: 'none', color: '#64748b',
                                fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px',
                                borderRadius: '6px', cursor: 'pointer'
                            }}
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* 4. KPI Summary Bar */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title">Total compromisos</span>
                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '6px', borderRadius: '8px' }}><Shield size={18} /></div>
                    </div>
                    <div className="kpi-value">{compromisos.length}</div>
                    <div className="kpi-subtitle">Filtro actual</div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title" style={{ color: '#059669' }}>Cumplidos</span>
                        <div style={{ background: '#f0fdf4', color: '#10b981', padding: '6px', borderRadius: '8px' }}><CheckCircle size={18} /></div>
                    </div>
                    <div className="kpi-value" style={{ color: '#065f46' }}>
                        {compromisos.filter(c => c.estado === 'cumplido').length}
                    </div>
                    <div className="kpi-subtitle" style={{ color: '#10b981', fontWeight: 600 }}>Acciones cerradas</div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title" style={{ color: '#d97706' }}>Pendientes / En Proceso</span>
                        <div style={{ background: '#fffbeb', color: '#f59e0b', padding: '6px', borderRadius: '8px' }}><Clock size={18} /></div>
                    </div>
                    <div className="kpi-value" style={{ color: '#b45309' }}>
                        {compromisos.filter(c => ['pendiente', 'en_proceso'].includes(c.estado) && !isVencido(c.fecha_compromiso, c.estado)).length}
                    </div>
                    <div className="kpi-subtitle" style={{ color: '#d97706', fontWeight: 600 }}>Acciones abiertas a tiempo</div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title" style={{ color: '#b91c1c' }}>Vencidos</span>
                        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '6px', borderRadius: '8px' }}><AlertCircle size={18} /></div>
                    </div>
                    <div className="kpi-value" style={{ color: '#991b1b' }}>
                        {compromisos.filter(c => isVencido(c.fecha_compromiso, c.estado)).length}
                    </div>
                    <div className="kpi-subtitle" style={{ color: '#ef4444', fontWeight: 600 }}>Requieren atención inmediata</div>
                </div>

                <div className="kpi-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="kpi-title">Cierre de Compromisos</span>
                        <div style={{ background: '#f0fdf4', color: '#10b981', padding: '6px', borderRadius: '8px' }}><TrendingUp size={18} /></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <div className="kpi-value">
                            {compromisos.length > 0 ? Math.round((compromisos.filter(c => c.estado === 'cumplido').length / compromisos.length) * 100) : 0}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>%</div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', marginTop: '8px', overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${compromisos.length > 0 ? (compromisos.filter(c => c.estado === 'cumplido').length / compromisos.length) * 100 : 0}%`,
                                height: '100%',
                                background: '#10b981',
                                borderRadius: '10px',
                                transition: 'width 0.5s ease-out'
                            }}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ width: '100%', marginBottom: '1.5rem' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* 5. Compendio de Compromisos */}
            <div className="compromisos-grid">
                {compromisos.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '60px',
                        background: '#f9fafb',
                        borderRadius: '16px',
                        border: '1px dashed #cbd5e1',
                        color: '#94a3b8'
                    }}>
                        <Shield size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No se encontraron compromisos registrados con los filtros seleccionados</p>
                    </div>
                ) : (
                    compromisos.map((c) => {
                        const vencido = isVencido(c.fecha_compromiso, c.estado);
                        const statusColors = {
                            pendiente: { bg: '#fffbeb', border: '#fef3c7', text: '#b45309', bar: '#f59e0b' },
                            en_proceso: { bg: '#eff6ff', border: '#dbeafe', text: '#1d4ed8', bar: '#3b82f6' },
                            cumplido: { bg: '#f0fdf4', border: '#dcfce7', text: '#15803d', bar: '#10b981' },
                            vencido: { bg: '#fef2f2', border: '#fee2e2', text: '#b91c1c', bar: '#ef4444' }
                        };
                        const color = vencido ? statusColors.vencido : (statusColors[c.estado] || statusColors.pendiente);
                        const respMarca = (c.responsabilidad || 'contratista').toLowerCase();

                        return (
                            <div
                                key={c.id}
                                className="compromiso-card"
                                style={{
                                    borderTop: `4px solid ${color.bar}`,
                                }}
                            >
                                <div className="compromiso-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="status-badge" style={{ background: color.bg, color: color.text }}>
                                            {getEstadoIcon(vencido ? 'vencido' : c.estado)}
                                            {vencido ? 'VENCIDO' : c.estado.replace('_', ' ')}
                                        </div>
                                        <div
                                            className="resp-badge"
                                            style={{
                                                background: respMarca === 'abastible' ? '#e0f2fe' : '#f3e8ff',
                                                color: respMarca === 'abastible' ? '#0369a1' : '#6b21a8',
                                                border: `1px solid ${respMarca === 'abastible' ? '#bae6fd' : '#e9d5ff'}`
                                            }}
                                        >
                                            {respMarca === 'abastible' ? 'Abastible' : 'Contratista'}
                                        </div>
                                    </div>

                                    {['pendiente', 'en_proceso'].includes(c.estado) &&
                                        (user.role === 'admin' || user.id === c.creado_por_id) && (
                                            <button
                                                className="node-action-btn"
                                                onClick={() => handleEditClick(c)}
                                                title="Editar compromiso"
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <p className="card-title">
                                        {c.descripcion}
                                    </p>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                            <Calendar size={14} />
                                            <span>Vencimiento:</span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: vencido ? '#ef4444' : '#1e293b' }}>
                                            {new Date(c.fecha_compromiso).toLocaleDateString('es-CL')}
                                        </span>
                                    </div>

                                    {/* Registrado Por */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                            <User size={14} />
                                            <span>Registrado por:</span>
                                        </div>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                            {c.creadoPor?.name || c.responsable?.name || 'Sin especificar'}
                                        </span>
                                    </div>

                                    {/* Responsable de Cierre (If Cumplido) */}
                                    {c.estado === 'cumplido' && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                                                <CheckSquare size={14} />
                                                <span>Responsable del cierre:</span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: '#065f46' }}>
                                                {c.responsableCierre?.name || 'Administrador'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {c.registro && (
                                    <div className="card-meta">
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                                        Origen: {c.registro.periodo} - {c.registro.eecc_nombre}
                                    </div>
                                )}

                                {/* Evidence Upload Section */}
                                {c.estado !== 'cumplido' &&
                                    ['admin', 'administrador_contrato', 'contratista_admin', 'contratista_user'].includes(user?.role) && (
                                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Cargar Evidencia de Compromiso:</div>
                                            <input
                                                type="file"
                                                id={`evidence-file-${c.id}`}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setEvidenceFiles(prev => ({ ...prev, [c.id]: e.target.files[0] }));
                                                    }
                                                }}
                                                style={{ fontSize: '0.75rem', color: '#64748b' }}
                                            />
                                            <textarea
                                                placeholder="Comentario sobre la evidencia..."
                                                value={evidenceComments[c.id] || ''}
                                                onChange={(e) => setEvidenceComments(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                style={{ fontSize: '0.75rem', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '40px', fontFamily: 'inherit' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                disabled={uploadingCompromisoId === c.id}
                                                onClick={() => handleUploadEvidence(c.id)}
                                                style={{
                                                    marginTop: '4px', background: '#2563eb', borderColor: '#2563eb',
                                                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', fontSize: '0.8rem',
                                                    padding: '6px 12px', cursor: 'pointer', borderRadius: '6px', border: 'none',
                                                    color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                {uploadingCompromisoId === c.id ? 'Subiendo...' : 'Cargar Evidencia'}
                                            </button>
                                        </div>
                                    )}

                                {/* Uploaded Evidence Section */}
                                {c.ruta_evidencia && (
                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>Evidencia Cargada:</span>
                                            <a
                                                href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${c.ruta_evidencia}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 700 }}
                                                title="Ver/Descargar Evidencia"
                                            >
                                                <Download size={14} /> Ver Archivo
                                            </a>
                                        </div>
                                        {c.comentario_evidencia && (
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                                                "{c.comentario_evidencia}"
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Admin Action: Mark as Fulfilled */}
                                {['pendiente', 'en_proceso'].includes(c.estado) && isAdminOrADC && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleCumplir(c.id)}
                                        style={{
                                            marginTop: '4px', background: '#10b981', borderColor: '#10b981',
                                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', padding: '8px 14px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            cursor: 'pointer', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600
                                        }}
                                    >
                                        <CheckCircle size={18} /> Marcar Cumplido
                                    </button>
                                )}

                                {isAdminOrADC && (
                                    <button
                                        className="btn-secondary"
                                        onClick={() => handleDelete(c.id)}
                                        style={{
                                            marginTop: '4px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2',
                                            padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            cursor: 'pointer', borderRadius: '8px', border: '1px solid #fee2e2', fontWeight: 600, fontSize: '0.8rem'
                                        }}
                                    >
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Edit Modal */}
            {editingCompromiso && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="form-card" style={{ width: '500px', maxWidth: '90%', background: 'white', padding: '24px', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Editar Compromiso</h2>
                            <button className="btn-icon" onClick={() => setEditingCompromiso(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Descripción</label>
                                <textarea
                                    value={editForm.descripcion}
                                    onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                                    rows={3}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Marca de Responsabilidad</label>
                                <select
                                    value={editForm.responsabilidad}
                                    onChange={e => setEditForm({ ...editForm, responsabilidad: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                >
                                    <option value="contratista">Contratista</option>
                                    <option value="abastible">Abastible</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Fecha Compromiso</label>
                                <input
                                    type="date"
                                    value={editForm.fecha_compromiso}
                                    onChange={e => setEditForm({ ...editForm, fecha_compromiso: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setEditingCompromiso(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', background: '#003594', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Save size={16} /> Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

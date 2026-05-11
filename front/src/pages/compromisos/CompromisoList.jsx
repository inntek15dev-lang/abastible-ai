// IEEE Trace: REQ-010 | US-010 | pages/compromisos/CompromisoList.jsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { CheckCircle, Clock, AlertCircle, Calendar, User, Edit, X, Save, Shield, Trash2, TrendingUp } from 'lucide-react';
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
    const [contratoNumero, setContratoNumero] = useState('');

    const hallazgoId = searchParams.get('hallazgo');
    const { user, isAdmin } = useAuth();
    const isAdminOrADC = isAdmin || user?.role === 'administrador_contrato';

    // Edit Modal State
    const [editingCompromiso, setEditingCompromiso] = useState(null);
    const [editForm, setEditForm] = useState({
        descripcion: '',
        fecha_compromiso: '',
        responsable_id: ''
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

        // Check for specific contract match
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

    }, [filter, selectedContratista, selectedServicio, selectedDependencia]);

    const fetchCompromisos = async () => {
        try {
            setLoading(true);
            let params = {};
            if (filter === 'vencidos') params.vencidos = 'true';
            else if (filter !== 'all') params.estado = filter;
            if (hallazgoId) params.hallazgo_id = hallazgoId;

            // Apply Hierarchy Filters
            if (selectedContratista) params.contratista_id = selectedContratista;
            if (selectedServicio) params.servicio_id = selectedServicio;
            if (selectedDependencia) params.dependencia_id = selectedDependencia;

            const response = await api.get('/compromisos', { params });
            setCompromisos(response.data.data);
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

    const handleCumplir = async (id) => {
        const observacion = prompt('Observación de cumplimiento (opcional):');
        try {
            await api.patch(`/compromisos/${id}/cumplir`, { observacion_cumplimiento: observacion });
            fetchCompromisos();
        } catch (err) {
            setError('Error al marcar como cumplido');
        }
    };

    const handleEditClick = (comp) => {
        setEditingCompromiso(comp);
        setEditForm({
            descripcion: comp.descripcion,
            fecha_compromiso: comp.fecha_compromiso.split('T')[0],
            responsable_id: comp.responsable_id
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

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'cumplido': return <CheckCircle className="text-success" size={20} />;
            case 'vencido': return <AlertCircle className="text-danger" size={20} />;
            case 'en_proceso': return <Clock className="text-info" size={20} />;
            default: return <Clock className="text-warning" size={20} />;
        }
    };

    const isVencido = (fecha, estado) => {
        if (['cumplido'].includes(estado)) return false;
        return new Date(fecha) < new Date();
    };

    if (loading && compromisos.length === 0) return <div className="loading">Cargando...</div>;

    return (
        <div className="compromisos-page">
            <header className="page-header" style={{ maxWidth: '1200px', margin: '0 auto 2rem auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#003594', color: 'white', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                            <Shield size={24} />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ margin: 0 }}>Gestión de Compromisos</h1>
                            <p className="page-subtitle" style={{ margin: 0 }}>Seguimiento y control de acciones de mejora</p>
                        </div>
                    </div>
                    {contratoNumero && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '8px', color: '#1e40af' }}>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', color: '#60a5fa' }}>Contrato N°</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{contratoNumero}</span>
                        </div>
                    )}
                </div>

                {/* Hierarchy Filters */}
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', width: '100%', marginTop: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Empresa Contratista</label>
                        <select
                            className="form-control"
                            value={selectedContratista}
                            onChange={(e) => { setSelectedContratista(e.target.value); setSelectedServicio(''); setSelectedDependencia(''); }}
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
                        >
                            <option value="">Todas las Dependencias</option>
                            {filteredDependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div className="filter-tabs" style={{ marginTop: '1rem' }}>
                    {[
                        { id: 'all', label: 'TODOS', icon: null },
                        { id: 'pendiente', label: 'PENDIENTE', color: '#f59e0b' },
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

                {/* KPI Summary Section */}
                <div className="kpi-grid" style={{ width: '100%' }}>
                    <div className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="kpi-title">Total compromisos</span>
                            <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '6px', borderRadius: '8px' }}><Shield size={18} /></div>
                        </div>
                        <div className="kpi-value">{compromisos.length}</div>
                        <div className="kpi-subtitle">Cargados en el periodo</div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="kpi-title" style={{ color: '#059669' }}>Cumplidos</span>
                            <div style={{ background: '#f0fdf4', color: '#10b981', padding: '6px', borderRadius: '8px' }}><CheckCircle size={18} /></div>
                        </div>
                        <div className="kpi-value" style={{ color: '#065f46' }}>
                            {compromisos.filter(c => c.estado === 'cumplido').length}
                        </div>
                        <div className="kpi-subtitle" style={{ color: '#10b981', fontWeight: 600 }}>Acciones cerradas</div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="kpi-title" style={{ color: '#b91c1c' }}>Pendientes / Vencidos</span>
                            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '6px', borderRadius: '8px' }}><Clock size={18} /></div>
                        </div>
                        <div className="kpi-value" style={{ color: '#991b1b' }}>
                            {compromisos.filter(c => c.estado !== 'cumplido').length}
                        </div>
                        <div className="kpi-subtitle" style={{ color: '#ef4444', fontWeight: 600 }}>Acciones abiertas</div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="kpi-title">Cierre Accountability</span>
                            <div style={{ background: '#f0fdf4', color: '#10b981', padding: '6px', borderRadius: '8px' }}><TrendingUp size={18} /></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <div className="kpi-value">
                                {compromisos.length > 0 ? Math.round((compromisos.filter(c => c.estado === 'cumplido').length / compromisos.length) * 100) : 0}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>%</div>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
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
            </header>

            {error && (
                <div className="alert alert-danger" style={{ maxWidth: '1200px', margin: '0 auto 2rem auto' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            <div className="compromisos-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No se encontraron compromisos registrados</p>
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

                        return (
                            <div
                                key={c.id}
                                className="compromiso-card"
                                style={{
                                    borderTop: `4px solid ${color.bar}`,
                                }}
                            >
                                <div className="compromiso-header">
                                    <div className="status-badge" style={{ background: color.bg, color: color.text }}>
                                        {getEstadoIcon(c.estado)}
                                        {vencido ? 'VENCIDO' : c.estado.replace('_', ' ')}
                                    </div>

                                    {['pendiente', 'en_proceso'].includes(c.estado) &&
                                        (user.role === 'admin' || user.id === c.creado_por_id) && (
                                            <button
                                                className="node-action-btn"
                                                onClick={() => handleEditClick(c)}
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
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                            <User size={14} />
                                            <span>Responsable:</span>
                                        </div>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                            {c.responsable?.name || 'Sin asignar'}
                                        </span>
                                    </div>
                                </div>

                                {c.registro && (
                                    <div className="card-meta">
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                                        Origen: {c.registro.periodo} - {c.registro.eecc_nombre}
                                    </div>
                                )}

                                {['pendiente', 'en_proceso'].includes(c.estado) &&
                                    (user.id === c.responsable_id || user.role === 'admin') && (
                                        <button
                                            className="btn-primary"
                                            onClick={() => handleCumplir(c.id)}
                                            style={{
                                                marginTop: '4px',
                                                background: '#10b981',
                                                borderColor: '#10b981',
                                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
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
                                            marginTop: '8px',
                                            color: '#ef4444',
                                            borderColor: '#fee2e2',
                                            background: '#fef2f2',
                                        }}
                                    >
                                        <Trash2 size={18} /> Eliminar
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Edit Modal */}
            {
                editingCompromiso && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div className="form-card" style={{ width: '500px', maxWidth: '90%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2>Editar Compromiso</h2>
                                <button className="btn-icon" onClick={() => setEditingCompromiso(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate}>
                                <div className="form-group">
                                    <label>Descripción</label>
                                    <textarea
                                        value={editForm.descripcion}
                                        onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                                        rows={3}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha Compromiso</label>
                                    <input
                                        type="date"
                                        value={editForm.fecha_compromiso}
                                        onChange={e => setEditForm({ ...editForm, fecha_compromiso: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setEditingCompromiso(null)}>Cancelar</button>
                                    <button type="submit" className="btn-primary">
                                        <Save size={16} /> Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
} );
}

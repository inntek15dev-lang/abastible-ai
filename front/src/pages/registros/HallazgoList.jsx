// IEEE Trace: REQ-003 | US-003 | pages/registros/HallazgoList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertTriangle, CheckCircle2, Clock, Filter, Search, RotateCcw,
    ChevronDown, ChevronRight, FileSpreadsheet, FileText, Building,
    MapPin, FolderOpen, Layers, ListChecks, Check, Shield, Eye,
    TrendingUp, ExternalLink, RefreshCw, BarChart2
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import FichaHallazgoModal from '../../components/forms/FichaHallazgoModal';

const SEVERIDAD_CONFIG = {
    critico: { label: 'Crítico', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    mayor: { label: 'Mayor', bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    menor: { label: 'Menor', bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
    observacion: { label: 'Observación', bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
    no_conformidad: { label: 'No Conformidad', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    oportunidad_mejora: { label: 'Oportunidad Mejora', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }
};

const ESTADO_CONFIG = {
    abierto: { label: 'Abierto', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    en_proceso: { label: 'En Proceso', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    cerrado: { label: 'Cerrado', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
};

export default function HallazgoList() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isAdminContrato = user?.role === 'administrador_contrato';
    const canChangeStatus = isAdmin || isAdminContrato;

    // Filters state
    const [filters, setFilters] = useState({
        contratista_id: 'todos',
        gerencia_id: 'todas',
        subgerencia_id: 'todas',
        servicio_id: 'todos',
        dependencia_id: 'todas',
        programa_id: 'todos',
        periodo_desde: '',
        periodo_hasta: '',
        estado: 'todos',
        tipo: 'todos',
        search: ''
    });

    // Options for filter selects
    const [options, setOptions] = useState({
        contratistas: [],
        gerencias: [],
        subgerencias: [],
        servicios: [],
        dependencias: [],
        programas: [],
        vinculaciones: []
    });

    const [hallazgos, setHallazgos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHallazgo, setSelectedHallazgo] = useState(null);
    const [isFichaOpen, setIsFichaOpen] = useState(false);
    const [activeChartTab, setActiveChartTab] = useState('empresa'); // 'empresa' | 'planta' | 'vinculacion'

    // Collapse/Expand state for accordion (maps of ID -> boolean)
    const [expandedProgramas, setExpandedProgramas] = useState({});
    const [expandedElementos, setExpandedElementos] = useState({});

    // 1. Load Filter Options
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [contRes, gerRes, subgRes, servRes, depRes, progRes, vincRes] = await Promise.all([
                    api.get('/contratistas'),
                    api.get('/resources/gerencias'),
                    api.get('/resources/subgerencias'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/resources/dependencias'),
                    api.get('/programas'),
                    api.get('/vinculaciones')
                ]);

                setOptions({
                    contratistas: contRes.data?.data || [],
                    gerencias: gerRes.data?.data || [],
                    subgerencias: subgRes.data?.data || [],
                    servicios: servRes.data?.data || [],
                    dependencias: depRes.data?.data || [],
                    programas: progRes.data?.data || [],
                    vinculaciones: vincRes.data?.data || []
                });
            } catch (err) {
                console.error('Error cargando opciones de filtro:', err);
            }
        };
        loadFilterOptions();
    }, []);

    // 2. Fetch Hallazgos based on filters
    const fetchHallazgos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.contratista_id !== 'todos') params.append('contratista_id', filters.contratista_id);
            if (filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
            if (filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
            if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
            if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.periodo_desde) params.append('periodo_desde', filters.periodo_desde);
            if (filters.periodo_hasta) params.append('periodo_hasta', filters.periodo_hasta);
            if (filters.estado !== 'todos') params.append('estado', filters.estado);
            if (filters.tipo !== 'todos') params.append('tipo', filters.tipo);
            if (filters.search) params.append('search', filters.search);

            const res = await api.get(`/hallazgos?${params.toString()}`);
            if (res.data?.success) {
                const data = res.data.data || [];
                setHallazgos(data);

                // Auto-expand first 3 programs by default
                const initProgExp = {};
                const initElemExp = {};
                data.forEach(h => {
                    const progId = h.registroActividad?.actividad?.elemento?.programa?.id || h.registro?.programa?.id || 'prog-gen';
                    const elemId = h.registroActividad?.actividad?.elemento?.id || 'elem-gen';
                    initProgExp[progId] = true;
                    initElemExp[`${progId}_${elemId}`] = true;
                });
                setExpandedProgramas(initProgExp);
                setExpandedElementos(initElemExp);
            }
        } catch (err) {
            console.error('Error al obtener hallazgos:', err);
            toast.error('Error cargando hallazgos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHallazgos();
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            contratista_id: 'todos',
            gerencia_id: 'todas',
            subgerencia_id: 'todas',
            servicio_id: 'todos',
            dependencia_id: 'todas',
            programa_id: 'todos',
            periodo_desde: '',
            periodo_hasta: '',
            estado: 'todos',
            tipo: 'todos',
            search: ''
        });
    };

    // 3. Quick direct status change
    const handleQuickStatusChange = async (hallazgoId, nuevoEstado) => {
        if (!canChangeStatus) return;
        const toastId = toast.loading(`Cambiando estado a ${nuevoEstado}...`);
        try {
            const res = await api.put(`/hallazgos/${hallazgoId}`, { estado: nuevoEstado });
            if (res.data?.success) {
                toast.success(`Estado actualizado a ${nuevoEstado.toUpperCase()}`, { id: toastId });
                setHallazgos(prev => prev.map(h => h.id === hallazgoId ? { ...h, estado: nuevoEstado, fecha_cierre: nuevoEstado === 'cerrado' ? new Date().toISOString() : null } : h));
            } else {
                toast.error(res.data?.message || 'Error al actualizar estado', { id: toastId });
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('Error al cambiar estado', { id: toastId });
        }
    };

    // 4. KPIs Calculation
    const kpis = useMemo(() => {
        const total = hallazgos.length;
        const abiertos = hallazgos.filter(h => h.estado === 'abierto').length;
        const enProceso = hallazgos.filter(h => h.estado === 'en_proceso').length;
        const cerrados = hallazgos.filter(h => h.estado === 'cerrado').length;

        // Tiempo promedio de mitigación (días)
        // Para hallazgos cerrados: (fecha_cierre - created_at)
        // Si no está cerrado: días abiertos transcurridos
        let totalDiasMitigacion = 0;
        let countConMitigacion = 0;

        hallazgos.forEach(h => {
            if (h.created_at) {
                const start = new Date(h.created_at).getTime();
                const end = h.fecha_cierre ? new Date(h.fecha_cierre).getTime() : Date.now();
                const dias = Math.max(0, Math.round((end - start) / (1000 * 3600 * 24)));
                totalDiasMitigacion += dias;
                countConMitigacion++;
            }
        });

        const tiempoPromedioDias = countConMitigacion > 0 ? (totalDiasMitigacion / countConMitigacion).toFixed(1) : '0';

        return {
            total,
            abiertos,
            enProceso,
            cerrados,
            tiempoPromedioDias
        };
    }, [hallazgos]);

    // 5. Chart Data (Bar Charts)
    const chartData = useMemo(() => {
        // A. Por Empresa
        const empresaMap = {};
        // B. Por Planta
        const plantaMap = {};
        // C. Por Vinculacion
        const vincMap = {};

        hallazgos.forEach(h => {
            const vinc = h.registro?.vinculacionEntidad;
            const empresaName = vinc?.contratista?.nombre || h.registro?.eecc_nombre || 'Sin Empresa';
            const plantaName = vinc?.dependencia?.nombre || 'Sin Planta';
            const vincName = `${vinc?.servicio?.nombre || 'Servicio'} - ${vinc?.dependencia?.nombre || 'Planta'}`;

            // Empresa
            if (!empresaMap[empresaName]) empresaMap[empresaName] = { name: empresaName, total: 0, abiertos: 0, cerrados: 0 };
            empresaMap[empresaName].total++;
            if (h.estado === 'abierto') empresaMap[empresaName].abiertos++;
            if (h.estado === 'cerrado') empresaMap[empresaName].cerrados++;

            // Planta
            if (!plantaMap[plantaName]) plantaMap[plantaName] = { name: plantaName, total: 0, abiertos: 0, cerrados: 0 };
            plantaMap[plantaName].total++;
            if (h.estado === 'abierto') plantaMap[plantaName].abiertos++;
            if (h.estado === 'cerrado') plantaMap[plantaName].cerrados++;

            // Vinculacion
            if (!vincMap[vincName]) vincMap[vincName] = { name: vincName, total: 0, abiertos: 0, cerrados: 0 };
            vincMap[vincName].total++;
            if (h.estado === 'abierto') vincMap[vincName].abiertos++;
            if (h.estado === 'cerrado') vincMap[vincName].cerrados++;
        });

        return {
            empresa: Object.values(empresaMap).sort((a, b) => b.total - a.total).slice(0, 10),
            planta: Object.values(plantaMap).sort((a, b) => b.total - a.total).slice(0, 10),
            vinculacion: Object.values(vincMap).sort((a, b) => b.total - a.total).slice(0, 10)
        };
    }, [hallazgos]);

    // 6. Hierarchical Grouping: Programas -> Elementos -> Actividades -> Hallazgos
    const hierarchicalTree = useMemo(() => {
        const tree = {};

        hallazgos.forEach(h => {
            const act = h.registroActividad?.actividad;
            const elem = act?.elemento;
            const prog = elem?.programa || h.registro?.programa || { id: 'general', nombre: 'Programa General / No asignado' };

            const progKey = prog.id || 'general';
            if (!tree[progKey]) {
                tree[progKey] = {
                    programa: prog,
                    total: 0,
                    abiertos: 0,
                    enProceso: 0,
                    cerrados: 0,
                    elementos: {}
                };
            }

            tree[progKey].total++;
            if (h.estado === 'abierto') tree[progKey].abiertos++;
            if (h.estado === 'en_proceso') tree[progKey].enProceso++;
            if (h.estado === 'cerrado') tree[progKey].cerrados++;

            const elemKey = elem?.id || 'elem-gen';
            if (!tree[progKey].elementos[elemKey]) {
                tree[progKey].elementos[elemKey] = {
                    elemento: elem || { id: 'elem-gen', codigo: 'E-GEN', nombre: 'Elemento General' },
                    total: 0,
                    actividades: {}
                };
            }
            tree[progKey].elementos[elemKey].total++;

            const actKey = act?.id || 'act-gen';
            if (!tree[progKey].elementos[elemKey].actividades[actKey]) {
                tree[progKey].elementos[elemKey].actividades[actKey] = {
                    actividad: act || { id: 'act-gen', codigo: 'ACT-GEN', nombre: 'Actividad General' },
                    hallazgos: []
                };
            }
            tree[progKey].elementos[elemKey].actividades[actKey].hallazgos.push(h);
        });

        return Object.values(tree);
    }, [hallazgos]);

    // Accordion Toggle Handlers
    const togglePrograma = (progId) => {
        setExpandedProgramas(prev => ({ ...prev, [progId]: !prev[progId] }));
    };

    const toggleElemento = (progId, elemId) => {
        const key = `${progId}_${elemId}`;
        setExpandedElementos(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleExpandAll = () => {
        const newProg = {};
        const newElem = {};
        hierarchicalTree.forEach(pt => {
            newProg[pt.programa.id] = true;
            Object.values(pt.elementos).forEach(el => {
                newElem[`${pt.programa.id}_${el.elemento.id}`] = true;
            });
        });
        setExpandedProgramas(newProg);
        setExpandedElementos(newElem);
    };

    const handleCollapseAll = () => {
        setExpandedProgramas({});
        setExpandedElementos({});
    };

    // 7. Exports (Excel & PDF)
    const handleExportExcel = () => {
        const params = new URLSearchParams();
        if (filters.contratista_id !== 'todos') params.append('contratista_id', filters.contratista_id);
        if (filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
        if (filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
        if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
        if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
        if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
        if (filters.periodo_desde) params.append('periodo_desde', filters.periodo_desde);
        if (filters.periodo_hasta) params.append('periodo_hasta', filters.periodo_hasta);
        if (filters.estado !== 'todos') params.append('estado', filters.estado);
        if (filters.tipo !== 'todos') params.append('tipo', filters.tipo);
        if (filters.search) params.append('search', filters.search);
        params.append('token', localStorage.getItem('token'));

        window.open(`${api.defaults.baseURL}/reportes/hallazgos/excel?${params.toString()}`, '_blank');
    };

    const handleExportPdf = () => {
        const params = new URLSearchParams();
        if (filters.contratista_id !== 'todos') params.append('contratista_id', filters.contratista_id);
        if (filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
        if (filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
        if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
        if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
        if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
        if (filters.periodo_desde) params.append('periodo_desde', filters.periodo_desde);
        if (filters.periodo_hasta) params.append('periodo_hasta', filters.periodo_hasta);
        if (filters.estado !== 'todos') params.append('estado', filters.estado);
        if (filters.tipo !== 'todos') params.append('tipo', filters.tipo);
        if (filters.search) params.append('search', filters.search);
        params.append('token', localStorage.getItem('token'));

        window.open(`${api.defaults.baseURL}/reportes/hallazgos/pdf?${params.toString()}`, '_blank');
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Corporativo */}
            <div style={{
                background: '#ffffff', borderRadius: '16px', padding: '24px',
                border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: '#003594', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,53,148,0.2)'
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                            Gestión Integral de Hallazgos
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                            Control, seguimiento y mitigación de no conformidades y observaciones operacionales OIEM
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={handleExportExcel}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                            background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '10px',
                            color: '#15803d', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s ease', height: '42px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                        title="Descargar Reporte Oficial Excel"
                    >
                        <FileSpreadsheet size={16} />
                        Excel
                    </button>

                    <button
                        onClick={handleExportPdf}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                            background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '10px',
                            color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s ease', height: '42px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                        title="Descargar Reporte Oficial PDF"
                    >
                        <FileText size={16} />
                        PDF Corporativo
                    </button>
                </div>
            </div>

            {/* Panel de Filtros Completo (Idéntico a Dashboard + Filtro por Estado + Tipo) */}
            <div style={{
                background: '#ffffff', borderRadius: '16px', padding: '20px',
                border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#003594', fontWeight: 700, fontSize: '0.95rem' }}>
                        <Filter size={18} />
                        Filtros de Búsqueda y Segmentación
                    </div>
                    <button
                        onClick={handleResetFilters}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent',
                            border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        <RotateCcw size={14} /> Limpiar Filtros
                    </button>
                </div>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px'
                }}>
                    {/* Contratista */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Empresa Contratista
                        </label>
                        <select
                            value={filters.contratista_id}
                            onChange={(e) => handleFilterChange('contratista_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todos">Todas las empresas</option>
                            {options.contratistas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre || c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Gerencia */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Gerencia
                        </label>
                        <select
                            value={filters.gerencia_id}
                            onChange={(e) => handleFilterChange('gerencia_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todas">Todas las gerencias</option>
                            {options.gerencias.map(g => (
                                <option key={g.id} value={g.id}>{g.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subgerencia */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Subgerencia
                        </label>
                        <select
                            value={filters.subgerencia_id}
                            onChange={(e) => handleFilterChange('subgerencia_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todas">Todas las subgerencias</option>
                            {options.subgerencias.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Servicio */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Servicio
                        </label>
                        <select
                            value={filters.servicio_id}
                            onChange={(e) => handleFilterChange('servicio_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todos">Todos los servicios</option>
                            {options.servicios.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dependencia / Planta */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Planta / Dependencia
                        </label>
                        <select
                            value={filters.dependencia_id}
                            onChange={(e) => handleFilterChange('dependencia_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todas">Todas las dependencias</option>
                            {options.dependencias.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Programa */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Programa
                        </label>
                        <select
                            value={filters.programa_id}
                            onChange={(e) => handleFilterChange('programa_id', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todos">Todos los programas</option>
                            {options.programas.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Estado del Hallazgo */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Estado del Hallazgo
                        </label>
                        <select
                            value={filters.estado}
                            onChange={(e) => handleFilterChange('estado', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="abierto">Abierto</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="cerrado">Cerrado</option>
                        </select>
                    </div>

                    {/* Tipo / Severidad */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Clasificación / Tipo
                        </label>
                        <select
                            value={filters.tipo}
                            onChange={(e) => handleFilterChange('tipo', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="todos">Todas las clasificaciones</option>
                            <option value="critico">Crítico</option>
                            <option value="mayor">Mayor</option>
                            <option value="menor">Menor</option>
                            <option value="observacion">Observación</option>
                            <option value="no_conformidad">No Conformidad</option>
                            <option value="oportunidad_mejora">Oportunidad Mejora</option>
                        </select>
                    </div>

                    {/* Período Desde */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Período Desde
                        </label>
                        <input
                            type="month"
                            value={filters.periodo_desde}
                            onChange={(e) => handleFilterChange('periodo_desde', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>

                    {/* Período Hasta */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Período Hasta
                        </label>
                        <input
                            type="month"
                            value={filters.periodo_hasta}
                            onChange={(e) => handleFilterChange('periodo_hasta', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                    </div>

                    {/* Buscador de Texto */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                            Búsqueda por Descripción o Acción
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="Escriba para filtrar por texto..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Fila de KPIs Ejecutivos */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'
            }}>
                {/* Total */}
                <div style={{
                    background: '#ffffff', borderRadius: '14px', padding: '18px 20px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Total Hallazgos
                    </span>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#003594' }}>
                        {kpis.total}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        En el perímetro seleccionado
                    </span>
                </div>

                {/* Abiertos */}
                <div style={{
                    background: '#fef2f2', borderRadius: '14px', padding: '18px 20px',
                    border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                            Abiertos
                        </span>
                        <AlertTriangle size={18} color="#ef4444" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>
                        {kpis.abiertos}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                        Requieren plan correctivo
                    </span>
                </div>

                {/* En Proceso */}
                <div style={{
                    background: '#fffbeb', borderRadius: '14px', padding: '18px 20px',
                    border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                            En Proceso
                        </span>
                        <Clock size={18} color="#d97706" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>
                        {kpis.enProceso}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
                        En fase de subsanación
                    </span>
                </div>

                {/* Cerrados */}
                <div style={{
                    background: '#f0fdf4', borderRadius: '14px', padding: '18px 20px',
                    border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                            Cerrados
                        </span>
                        <CheckCircle2 size={18} color="#16a34a" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>
                        {kpis.cerrados}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                        Mitigados con éxito
                    </span>
                </div>

                {/* Tiempo Promedio */}
                <div style={{
                    background: '#f8fafc', borderRadius: '14px', padding: '18px 20px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                            Mitigación Promedio
                        </span>
                        <TrendingUp size={18} color="#003594" />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
                        {kpis.tiempoPromedioDias} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>días</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Ciclo promedio de atención
                    </span>
                </div>
            </div>

            {/* Sección de Gráficos de Barras Compactos y Reactivos */}
            <div style={{
                background: '#ffffff', borderRadius: '16px', padding: '20px',
                border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={18} color="#003594" />
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                            Distribución de Hallazgos
                        </h3>
                    </div>

                    {/* Tabs del gráfico */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '4px' }}>
                        <button
                            type="button"
                            onClick={() => setActiveChartTab('empresa')}
                            style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: activeChartTab === 'empresa' ? '#ffffff' : 'transparent',
                                color: activeChartTab === 'empresa' ? '#003594' : '#64748b',
                                fontWeight: activeChartTab === 'empresa' ? 700 : 500,
                                fontSize: '0.8rem', cursor: 'pointer', boxShadow: activeChartTab === 'empresa' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            Por Empresa
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveChartTab('planta')}
                            style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: activeChartTab === 'planta' ? '#ffffff' : 'transparent',
                                color: activeChartTab === 'planta' ? '#003594' : '#64748b',
                                fontWeight: activeChartTab === 'planta' ? 700 : 500,
                                fontSize: '0.8rem', cursor: 'pointer', boxShadow: activeChartTab === 'planta' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            Por Planta / Dependencia
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveChartTab('vinculacion')}
                            style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: activeChartTab === 'vinculacion' ? '#ffffff' : 'transparent',
                                color: activeChartTab === 'vinculacion' ? '#003594' : '#64748b',
                                fontWeight: activeChartTab === 'vinculacion' ? 700 : 500,
                                fontSize: '0.8rem', cursor: 'pointer', boxShadow: activeChartTab === 'vinculacion' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            Por Vinculación
                        </button>
                    </div>
                </div>

                <div style={{ height: '220px', width: '100%' }}>
                    {chartData[activeChartTab].length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                            No hay hallazgos para mostrar en esta vista
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData[activeChartTab]} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    interval={0}
                                    angle={-15}
                                    textAnchor="end"
                                    height={40}
                                />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(val, name) => [val, name === 'abiertos' ? 'Abiertos' : (name === 'cerrados' ? 'Cerrados' : 'Total')]}
                                />
                                <Bar dataKey="abiertos" fill="#ef4444" name="Abiertos" radius={[4, 4, 0, 0]} stackId="a" />
                                <Bar dataKey="cerrados" fill="#10b981" name="Cerrados" radius={[4, 4, 0, 0]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Vista Jerárquica Plegable/Desplegable (Acordeón) */}
            <div style={{
                background: '#ffffff', borderRadius: '16px', padding: '20px',
                border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={18} color="#003594" />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            Estructura Jerárquica de Hallazgos
                        </h2>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                            Programas ➔ Elementos ➔ Actividades
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleExpandAll}
                            style={{
                                padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Expandir Todo
                        </button>
                        <button
                            type="button"
                            onClick={handleCollapseAll}
                            style={{
                                padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Colapsar Todo
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                        Cargando hallazgos y organizando árbol jerárquico...
                    </div>
                ) : hierarchicalTree.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron hallazgos con los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {hierarchicalTree.map((progGroup) => {
                            const prog = progGroup.programa;
                            const isProgOpen = Boolean(expandedProgramas[prog.id]);

                            return (
                                <div key={prog.id} style={{
                                    border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden'
                                }}>
                                    {/* Nivel 1: Header de Programa */}
                                    <div
                                        onClick={() => togglePrograma(prog.id)}
                                        style={{
                                            padding: '14px 18px', background: '#f8fafc', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            borderBottom: isProgOpen ? '1px solid #e2e8f0' : 'none',
                                            transition: 'background 0.2s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {isProgOpen ? <ChevronDown size={18} color="#003594" /> : <ChevronRight size={18} color="#64748b" />}
                                            <FolderOpen size={18} color="#003594" />
                                            <div>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                                                    {prog.nombre}
                                                </span>
                                                <span style={{ marginLeft: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                                                    ({Object.keys(progGroup.elementos).length} elementos)
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626' }}>
                                                {progGroup.abiertos} Abiertos
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#fffbeb', color: '#d97706' }}>
                                                {progGroup.enProceso} En Proceso
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a' }}>
                                                {progGroup.cerrados} Cerrados
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#003594', color: '#ffffff' }}>
                                                {progGroup.total} Total
                                            </span>
                                        </div>
                                    </div>

                                    {/* Nivel 2: Elementos del Programa */}
                                    {isProgOpen && (
                                        <div style={{ padding: '12px 18px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {Object.values(progGroup.elementos).map((elemGroup) => {
                                                const elem = elemGroup.elemento;
                                                const elemKey = `${prog.id}_${elem.id}`;
                                                const isElemOpen = Boolean(expandedElementos[elemKey]);

                                                return (
                                                    <div key={elem.id} style={{
                                                        border: '1px solid #f1f5f9', borderRadius: '10px', background: '#fafbfc'
                                                    }}>
                                                        {/* Header de Elemento */}
                                                        <div
                                                            onClick={() => toggleElemento(prog.id, elem.id)}
                                                            style={{
                                                                padding: '10px 14px', cursor: 'pointer', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'space-between',
                                                                borderBottom: isElemOpen ? '1px solid #f1f5f9' : 'none'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {isElemOpen ? <ChevronDown size={16} color="#003594" /> : <ChevronRight size={16} color="#94a3b8" />}
                                                                <Layers size={16} color="#64748b" />
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                                                    {elem.codigo ? `${elem.codigo} - ` : ''}{elem.nombre}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: '#e2e8f0', color: '#475569' }}>
                                                                {elemGroup.total} hallazgo{elemGroup.total > 1 ? 's' : ''}
                                                            </span>
                                                        </div>

                                                        {/* Nivel 3 y 4: Actividades y Lista de Hallazgos */}
                                                        {isElemOpen && (
                                                            <div style={{ padding: '10px 14px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                {Object.values(elemGroup.actividades).map((actGroup) => {
                                                                    const act = actGroup.actividad;

                                                                    return (
                                                                        <div key={act.id} style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
                                                                            {/* Header de Actividad */}
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                    <ListChecks size={15} color="#003594" />
                                                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                        {act.codigo ? `${act.codigo}: ` : ''}{act.nombre}
                                                                                    </span>
                                                                                </div>
                                                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                                                    {actGroup.hallazgos.length} hallazgo(s)
                                                                                </span>
                                                                            </div>

                                                                            {/* Listado de Hallazgos de la actividad */}
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                {actGroup.hallazgos.map((h) => {
                                                                                    const vinc = h.registro?.vinculacionEntidad;
                                                                                    const sev = SEVERIDAD_CONFIG[h.tipo] || SEVERIDAD_CONFIG.observacion;
                                                                                    const est = ESTADO_CONFIG[h.estado] || ESTADO_CONFIG.abierto;

                                                                                    return (
                                                                                        <div key={h.id} style={{
                                                                                            padding: '12px 14px', borderRadius: '8px',
                                                                                            background: '#f8fafc', border: '1px solid #e2e8f0',
                                                                                            display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                                                                                            justifyContent: 'space-between', gap: '12px'
                                                                                        }}>
                                                                                            {/* Info Hallazgo */}
                                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '280px' }}>
                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#003594' }}>
                                                                                                        #{h.id}
                                                                                                    </span>
                                                                                                    <span style={{
                                                                                                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                                                                                                        background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`
                                                                                                    }}>
                                                                                                        {sev.label}
                                                                                                    </span>
                                                                                                    <span style={{
                                                                                                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                                                                                                        background: est.bg, color: est.text, border: `1px solid ${est.border}`
                                                                                                    }}>
                                                                                                        {est.label}
                                                                                                    </span>
                                                                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                                                                                                        {vinc?.contratista?.nombre || h.registro?.eecc_nombre || '-'}
                                                                                                    </span>
                                                                                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                                                                        • {vinc?.dependencia?.nombre || '-'}
                                                                                                    </span>
                                                                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                                                        • {h.registro?.periodo || ''}
                                                                                                    </span>
                                                                                                </div>

                                                                                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.5 }}>
                                                                                                    {h.descripcion}
                                                                                                </p>

                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                                                                    <span>Auditor: <strong>{h.auditor?.name || '-'}</strong></span>
                                                                                                    <span>Fecha: {h.created_at ? new Date(h.created_at).toLocaleDateString('es-CL') : '-'}</span>
                                                                                                    {h.fecha_limite && <span>Límite: <strong>{h.fecha_limite}</strong></span>}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Botones de Acción */}
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                                {/* Botón Ver Ficha */}
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setSelectedHallazgo(h);
                                                                                                        setIsFichaOpen(true);
                                                                                                    }}
                                                                                                    style={{
                                                                                                        display: 'flex', alignItems: 'center', gap: '5px',
                                                                                                        padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                                                                                        background: '#ffffff', color: '#003594', fontSize: '0.78rem',
                                                                                                        fontWeight: 600, cursor: 'pointer'
                                                                                                    }}
                                                                                                    title="Ver Ficha Completa del Hallazgo"
                                                                                                >
                                                                                                    <Eye size={14} /> Ficha / Detalle
                                                                                                </button>

                                                                                                {/* Botones Rápidos de Cambio de Estado (Admin y Admin Contratos) */}
                                                                                                {canChangeStatus && (
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                        {h.estado !== 'abierto' && (
                                                                                                            <button
                                                                                                                onClick={() => handleQuickStatusChange(h.id, 'abierto')}
                                                                                                                style={{
                                                                                                                    padding: '6px 8px', borderRadius: '6px', border: '1px solid #fecaca',
                                                                                                                    background: '#fff', color: '#dc2626', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                                                                                                                }}
                                                                                                                title="Pasar a Abierto"
                                                                                                            >
                                                                                                                Abrir
                                                                                                            </button>
                                                                                                        )}
                                                                                                        {h.estado !== 'en_proceso' && (
                                                                                                            <button
                                                                                                                onClick={() => handleQuickStatusChange(h.id, 'en_proceso')}
                                                                                                                style={{
                                                                                                                    padding: '6px 8px', borderRadius: '6px', border: '1px solid #fde68a',
                                                                                                                    background: '#fff', color: '#d97706', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                                                                                                                }}
                                                                                                                title="Pasar a En Proceso"
                                                                                                            >
                                                                                                                En Proceso
                                                                                                            </button>
                                                                                                        )}
                                                                                                        {h.estado !== 'cerrado' && (
                                                                                                            <button
                                                                                                                onClick={() => handleQuickStatusChange(h.id, 'cerrado')}
                                                                                                                style={{
                                                                                                                    padding: '6px 10px', borderRadius: '6px', border: 'none',
                                                                                                                    background: '#16a34a', color: '#ffffff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                                                                                                                }}
                                                                                                                title="Cerrar Hallazgo Directamente"
                                                                                                            >
                                                                                                                Cerrar
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Ficha Técnica */}
            <FichaHallazgoModal
                isOpen={isFichaOpen}
                onClose={() => {
                    setIsFichaOpen(false);
                    setSelectedHallazgo(null);
                }}
                hallazgo={selectedHallazgo}
                currentUser={user}
                onUpdateSuccess={(updated) => {
                    setHallazgos(prev => prev.map(h => h.id === updated.id ? { ...h, ...updated } : h));
                }}
            />
        </div>
    );
}

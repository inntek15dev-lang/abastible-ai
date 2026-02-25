// IEEE Trace: REQ-010 | US-008 | pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
    AlertTriangle,
    TrendingUp,
    CheckCircle2,
    FileText,
    Users,
    LayoutDashboard,
    Search,
    RefreshCcw,
    Calendar,
    Briefcase,
    Building2
} from 'lucide-react';
import ComplianceChart from '../components/charts/ComplianceChart';
import ElementComplianceWidget from '../components/dashboard/ElementComplianceWidget';
import RecordsSummaryWidget from '../components/dashboard/RecordsSummaryWidget';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuth();
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters State
    const [filters, setFilters] = useState({
        fecha_inicio: '',
        fecha_fin: '',
        search: '',
        programa_id: 'todos',
        servicio_id: 'todos',
        dependencia_id: 'todas'
    });

    // Options State
    const [programs, setPrograms] = useState([]);
    const [services, setServices] = useState([]);
    const [dependencies, setDependencies] = useState([]);
    const [vinculaciones, setVinculaciones] = useState([]);
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [progRes, servRes, depRes, vincRes, histRes] = await Promise.all([
                    api.get('/programas'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/resources/dependencias'),
                    api.get('/vinculaciones'),
                    api.get('/dashboard/historico')
                ]);
                setPrograms(progRes.data.data || []);
                setServices(servRes.data.data || []);
                setDependencies(depRes.data.data || []);
                setVinculaciones(vincRes.data.data || []);
                setHistoryData(histRes.data.data || []);
            } catch (err) {
                console.error("Error loading filter options:", err);
            }
        };
        loadInitialData();
        fetchKpis();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchKpis();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters]);

    const fetchKpis = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
            if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
            if (filters.search) params.append('search', filters.search);
            if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);

            const response = await api.get(`/dashboard/kpis?${params.toString()}`);
            setKpis(response.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Error al cargar métricas');
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            fecha_inicio: '',
            fecha_fin: '',
            search: '',
            programa_id: 'todos',
            servicio_id: 'todos',
            dependencia_id: 'todas'
        });
    };

    const isContractor = ['contratista_admin', 'contratista_user'].includes(user?.role);
    const kpiTitle = isContractor ? 'Mi Gestión Operativa' : 'Monitor de Cumplimiento Global';

    const pctAuditados = kpis?.totalRegistros > 0
        ? Math.round((kpis.auditados / kpis.totalRegistros) * 100)
        : 0;

    const getColorForValue = (val) => {
        const num = parseFloat(val);
        if (isNaN(num) || val === null) return '#94a3b8'; // Gray for null/NaN
        if (num >= 85) return '#10b981';  // Green
        if (num >= 70) return '#f59e0b';  // Yellow
        return '#ef4444';                 // Red
    };

    const kpiCards = kpis ? [
        {
            title: 'CUMPLIMIENTO',
            value: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: getColorForValue(kpis.promedioCumplimiento) }}>
                        {kpis.promedioCumplimiento}%
                    </span>
                    {kpis.promedioCumplimientoAuditor !== null && (
                        <>
                            <span style={{ color: '#94a3b8', fontWeight: 400 }}>/</span>
                            <span style={{ color: getColorForValue(kpis.promedioCumplimientoAuditor) }}>
                                {kpis.promedioCumplimientoAuditor}%
                            </span>
                        </>
                    )}
                </div>
            ),
            subtitle: kpis.promedioCumplimientoAuditor !== null ? 'Declarado / Auditado' : 'Promedio declarado',
            color: '#334155', // Neutral base color
            bg: '#f8fafc',    // Neutral base bg
            icon: <TrendingUp size={20} color="#10b981" />
        },
        {
            title: 'AUDITADOS',
            value: `${pctAuditados}%`,
            subtitle: `${kpis.auditadosTerreno || 0} Terreno / ${kpis.auditadosSistema || 0} Sistema`,
            color: '#3b82f6',
            bg: '#eff6ff',
            icon: <CheckCircle2 size={20} color="#3b82f6" />
        },
        {
            title: 'EVIDENCIAS',
            value: kpis.totalEvidencias || 0,
            subtitle: 'Documentos cargados',
            color: '#8b5cf6',
            bg: '#f5f3ff',
            icon: <FileText size={20} color="#8b5cf6" />
        },
        {
            title: 'HALLAZGOS',
            value: kpis.hallazgosAbiertos,
            subtitle: 'Revisiones críticas',
            color: '#ef4444',
            bg: '#fef2f2',
            icon: <AlertTriangle size={20} color="#ef4444" />
        },
        {
            title: 'REGISTROS',
            value: kpis.totalRegistros,
            subtitle: 'Total del periodo',
            color: '#334155',
            bg: '#f8fafc',
            icon: <LayoutDashboard size={20} color="#334155" />
        }
    ] : [];

    const filteredDependencies = filters.servicio_id === 'todos'
        ? dependencies
        : dependencies.filter(dep =>
            vinculaciones.some(v =>
                String(v.servicio_id) === String(filters.servicio_id) &&
                String(v.dependencia_id) === String(dep.id)
            )
        );

    // Skeleton loader component
    if (loading && !kpis) return (
        <div className="dashboard-page">
            <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: '200px', borderRadius: '16px', marginBottom: '2rem' }} />
            <div className="kpi-grid">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />)}
            </div>
        </div>
    );

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <span className="subtitle">{kpiTitle}</span>
                </div>
                <div className="user-badge">
                    <strong>{user?.name}</strong>
                    <span>{user?.role?.replace('_', ' ').toUpperCase()}</span>
                    {user?.eecc_nombre && <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{user.eecc_nombre}</small>}
                </div>
            </header>

            {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

            {/* Filter Section */}
            <div className="dashboard-filters-container">
                <div className="filter-grid">
                    <div className="filter-group">
                        <label><Calendar size={12} inline /> Periodo Inicio</label>
                        <input
                            type="month"
                            className="filter-control"
                            value={filters.fecha_inicio}
                            onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label><Calendar size={12} inline /> Periodo Fin</label>
                        <input
                            type="month"
                            className="filter-control"
                            value={filters.fecha_fin}
                            onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label><Search size={12} inline /> Búsqueda</label>
                        <input
                            type="text"
                            placeholder="Nombre EECC, RUT..."
                            className="filter-control"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label><Briefcase size={12} inline /> Programa</label>
                        <select
                            className="filter-control"
                            value={filters.programa_id}
                            onChange={(e) => handleFilterChange('programa_id', e.target.value)}
                        >
                            <option value="todos">Todos los Programas</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label><RefreshCcw size={12} inline /> Servicio</label>
                        <select
                            className="filter-control"
                            value={filters.servicio_id}
                            onChange={(e) => handleFilterChange('servicio_id', e.target.value)}
                        >
                            <option value="todos">Todos los Servicios</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label><Building2 size={12} inline /> Dependencia</label>
                        <select
                            className="filter-control"
                            value={filters.dependencia_id}
                            onChange={(e) => handleFilterChange('dependencia_id', e.target.value)}
                        >
                            <option value="todas">Todas las Dependencias</option>
                            {filteredDependencies.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                    <button onClick={clearFilters} className="clear-filters-btn">
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div className="kpi-grid">
                {kpiCards.map((kpi, index) => (
                    <div key={index} className="kpi-card-polished">
                        <div className="kpi-card-icon-wrapper" style={{ backgroundColor: kpi.bg }}>
                            {kpi.icon}
                        </div>
                        <div className="kpi-card-content">
                            <span className="kpi-card-title">{kpi.title}</span>
                            <span className="kpi-card-value" style={{ color: kpi.color }}>{kpi.value}</span>
                            <span className="kpi-card-subtitle">{kpi.subtitle}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Section */}
            <div className="dashboard-section-card">
                <div className="section-title-wrapper">
                    <h3 className="section-title">
                        <TrendingUp size={22} color="#3b82f6" />
                        Evolución de Cumplimiento (Últimos 6 meses)
                    </h3>
                </div>

                <div style={{ marginTop: '1rem', height: 400 }}>
                    <ComplianceChart data={historyData} />
                </div>

                <div className="legend-container">
                    <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
                        <span>Óptimo ({'>'}85%)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                        <span>Regular (70% - 85%)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
                        <span>Crítico ({'<'}70%)</span>
                    </div>
                </div>
            </div>

            {/* Secondary Widgets Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                <div className="dashboard-section-card" style={{ marginBottom: 0 }}>
                    <ElementComplianceWidget period={filters.fecha_fin || new Date().toISOString().slice(0, 7)} />
                </div>
                <div className="dashboard-section-card" style={{ marginBottom: 0 }}>
                    <RecordsSummaryWidget period={filters.fecha_fin || new Date().toISOString().slice(0, 7)} />
                </div>
            </div>
        </div>
    );
}

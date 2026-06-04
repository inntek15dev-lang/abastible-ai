// IEEE Trace: REQ-010 | US-008 | pages/Dashboard.jsx
import { useState, useEffect, Fragment } from 'react';
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
    Building2,
    X
} from 'lucide-react';
import ComplianceChart from '../components/charts/ComplianceChart';
import ElementComplianceWidget from '../components/dashboard/ElementComplianceWidget';
import RecordsSummaryWidget from '../components/dashboard/RecordsSummaryWidget';
import AdcRelationsWidget from '../components/dashboard/AdcRelationsWidget';
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
        dependencia_id: 'todas',
        gerencia_id: 'todas',
        subgerencia_id: 'todas',
        adc_id: 'todos'
    });

    // Options State
    const [programs, setPrograms] = useState([]);
    const [services, setServices] = useState([]);
    const [dependencies, setDependencies] = useState([]);
    const [vinculaciones, setVinculaciones] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    
    // UI State
    const [activeTab, setActiveTab] = useState('monitor');
    
    // New Corporate Filters
    const [gerencias, setGerencias] = useState([]);
    const [subgerenciasRaw, setSubgerenciasRaw] = useState([]);
    const [adcs, setAdcs] = useState([]);

    // Matriz specific state
    const [matrixData, setMatrixData] = useState({ columns: [], rows: [] });
    const [loadingMatrix, setLoadingMatrix] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 0 });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [progRes, servRes, depRes, vincRes, histRes, gerRes, subgRes, adcRes] = await Promise.all([
                    api.get('/programas'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/resources/dependencias'),
                    api.get('/vinculaciones'),
                    api.get('/dashboard/historico'),
                    api.get('/resources/gerencias'),
                    api.get('/resources/subgerencias'),
                    api.get('/resources/adc')
                ]);
                setPrograms(progRes.data.data || []);
                setServices(servRes.data.data || []);
                setDependencies(depRes.data.data || []);
                setVinculaciones(vincRes.data.data || []);
                setHistoryData(histRes.data.data || []);
                setGerencias(gerRes.data.data || []);
                setSubgerenciasRaw(subgRes.data.data || []);
                setAdcs(adcRes.data.data || []);
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
            if (filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
            if (filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
            if (filters.adc_id !== 'todos') params.append('adc_id', filters.adc_id);

            const response = await api.get(`/dashboard/kpis?${params.toString()}`);
            setKpis(response.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Error al cargar métricas');
            setLoading(false);
        }
    };

    const fetchMatrixData = async () => {
        try {
            setLoadingMatrix(true);
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
            if (filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
            if (filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
            if (filters.adc_id !== 'todos') params.append('adc_id', filters.adc_id);
            params.append('limit', 5);
            params.append('page', page);

            const matrixRes = await api.get(`/dashboard/matrix?${params.toString()}`);
            if (matrixRes.data.success) {
                setMatrixData(matrixRes.data.data);
                setPagination(matrixRes.data.data.pagination);
            }
        } catch (error) {
            console.error("Error loading matrix:", error);
        } finally {
            setLoadingMatrix(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'matriz') {
            fetchMatrixData();
        }
    }, [activeTab, filters, page]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [filters]);

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
            dependencia_id: 'todas',
            gerencia_id: 'todas',
            subgerencia_id: 'todas',
            adc_id: 'todos'
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
            id: 'card-sync-status',
            title: '% EECC CON REGISTRO',
            value: `${kpis.porcentajeEmpresasConRegistro || 0}%`,
            subtitle: 'Empesas con reportes válidos (vinc. activas)',
            color: '#0ea5e9',
            bg: '#e0f2fe',
            icon: <Building2 size={20} color="#0ea5e9" title="Empresas con reporte al día" />
        },
        {
            id: 'card-performance-avg',
            title: 'TENDENCIA',
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
            subtitle: kpis.promedioCumplimientoAuditor !== null ? 'Cumplimiento (EECC / Auditor)' : 'Cumplimiento General',
            color: '#334155',
            bg: '#f8fafc',
            icon: <TrendingUp size={20} color="#10b981" title="Tendencia del periodo en evaluación" />
        },
        {
            id: 'card-audit-progress',
            title: 'AUDITADOS',
            value: `${pctAuditados}%`,
            subtitle: `${kpis.auditados || 0} de ${kpis.totalRegistros || 0} completados`,
            color: '#3b82f6',
            bg: '#eff6ff',
            icon: <CheckCircle2 size={20} color="#3b82f6" title="Porcentaje de registros que ya pasaron por auditoría" />
        },
        {
            id: 'card-accountability-close',
            title: 'Cierre de Compromisos',
            value: `${kpis.porcentajeCierreAccountability || 0}%`,
            subtitle: 'Compromisos de mejora cerrados',
            color: '#10b981',
            bg: '#f0fdf4',
            icon: <TrendingUp size={20} color="#10b981" title="Porcentaje de compromisos de mejora cerrados" />
        },
        {
            id: 'card-hallazgos-count',
            title: 'HALLAZGOS',
            value: kpis.hallazgosAbiertos,
            subtitle: 'Alertas críticas detectadas',
            color: '#ef4444',
            bg: '#fef2f2',
            icon: <AlertTriangle size={20} color="#ef4444" title="Puntos críticos que requieren atención inmediata" />
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

    const filteredSubgerencias = filters.gerencia_id === 'todas'
        ? subgerenciasRaw
        : subgerenciasRaw.filter(sub => String(sub.gerencia_id) === String(filters.gerencia_id));

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
                    <h1 id="dashboard-title">Dashboard</h1>
                    <span className="subtitle">{kpiTitle}</span>
                </div>
                <div className="user-badge">
                    <strong>{user?.name}</strong>
                    <span>{user?.role?.replace('_', ' ').toUpperCase()}</span>
                    {user?.eecc_nombre && <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{user.eecc_nombre}</small>}
                </div>
            </header>

            {user?.role === 'administrador_contrato' && (
                <AdcRelationsWidget userId={user.id} />
            )}

            {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

            {/* Filter Section */}
            <div className="dashboard-filters-container">
                <div className="filter-grid">
                    <div className="filter-group">
                        <label>Periodo Inicio</label>
                        <input
                            type="month"
                            className="filter-control"
                            value={filters.fecha_inicio}
                            onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Periodo Fin</label>
                        <input
                            type="month"
                            className="filter-control"
                            value={filters.fecha_fin}
                            onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Búsqueda</label>
                        <input
                            type="text"
                            placeholder="Nombre EECC, RUT..."
                            className="filter-control"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Programa</label>
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
                        <label>Servicio</label>
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
                        <label>Dependencia</label>
                        <select
                            className="filter-control"
                            value={filters.dependencia_id}
                            onChange={(e) => handleFilterChange('dependencia_id', e.target.value)}
                        >
                            <option value="todas">Todas las Dependencias</option>
                            {filteredDependencies.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>
                    {/* Filtros Corporativos Extras */}
                    <div className="filter-group">
                        <label>Gerencia</label>
                        <select
                            className="filter-control"
                            value={filters.gerencia_id}
                            onChange={(e) => {
                                handleFilterChange('gerencia_id', e.target.value);
                                handleFilterChange('subgerencia_id', 'todas'); // Reset subgerencia upon gerencia change
                            }}
                            disabled={isContractor || user?.role === 'administrador_contrato'}
                        >
                            <option value="todas">Todas las Gerencias</option>
                            {gerencias.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Subgerencia</label>
                        <select
                            className="filter-control"
                            value={filters.subgerencia_id}
                            onChange={(e) => handleFilterChange('subgerencia_id', e.target.value)}
                            disabled={isContractor || (user?.role === 'administrador_contrato' && filteredSubgerencias.length <= 1)}
                        >
                            <option value="todas">Todas las Subgerencias</option>
                            {filteredSubgerencias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Admin. Contrato</label>
                        <select
                            className="filter-control"
                            value={filters.adc_id}
                            onChange={(e) => handleFilterChange('adc_id', e.target.value)}
                            disabled={isContractor || user?.role === 'administrador_contrato'}
                        >
                            <option value="todos">Todos los ADC</option>
                            {adcs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    
                    <button onClick={fetchKpis} className="search-btn" title="Buscar">
                        <Search size={20} />
                    </button>

                    <button onClick={clearFilters} className="clear-filters-btn" title="Limpiar Filtros">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div className="kpi-grid">
                {kpiCards.map((kpi, index) => (
                    <div id={kpi.id} key={index} className="kpi-card-polished">
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

            {/* Main Content Section - TABS */}
            <div className="dashboard-tabs">
                <button 
                    id="tab-monitor"
                    className={`tab-button ${activeTab === 'monitor' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monitor')}
                >
                    <LayoutDashboard size={16} /> Visión Monitor
                </button>
                <button 
                    id="tab-matriz"
                    className={`tab-button ${activeTab === 'matriz' ? 'active' : ''}`}
                    onClick={() => setActiveTab('matriz')}
                >
                    <Users size={16} /> {isContractor ? 'Mis Contratos' : 'Matriz Contratistas'}
                </button>
                <button 
                    id="tab-pendientes"
                    className={`tab-button ${activeTab === 'pendientes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pendientes')}
                >
                    <AlertTriangle size={16} /> Pendientes de Acción
                </button>
            </div>

            {/* TAB: Monitor Global */}
            {activeTab === 'monitor' && (
                <>
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

                        <div className="legend-container" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', marginTop: '1rem' }}>
                            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Óptimo ({'>'}= 85%)</span>
                            </div>
                            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Alerta ({'>'}= 70%)</span>
                            </div>
                            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Crítico ({'<'} 70%)</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                        <div className="dashboard-section-card" style={{ marginBottom: 0 }}>
                            <ElementComplianceWidget filters={filters} />
                        </div>
                        <div className="dashboard-section-card" style={{ marginBottom: 0 }}>
                            <RecordsSummaryWidget filters={filters} />
                        </div>
                    </div>
                </>
            )}

            {/* TAB: Matriz de Contratistas */}
            {activeTab === 'matriz' && (
                <div className="dashboard-section-card pb-8">
                    <div className="section-title-wrapper mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title">
                            <Users size={22} color="#3b82f6" />
                            {isContractor ? 'Evolutivo de Cumplimiento' : 'Matriz de Contratistas'}
                        </h3>
                        {!loadingMatrix && pagination.total > 0 && (
                            <span style={{
                                fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600,
                                background: '#eff6ff', padding: '4px 12px', borderRadius: '99px'
                            }}>
                                {pagination.total} vinculaciones encontradas
                            </span>
                        )}
                    </div>
                    
                    {loadingMatrix ? (
                        <div className="text-center p-8 text-gray-500">Cargando matriz...</div>
                    ) : matrixData.rows?.length === 0 ? (
                        <div className="text-center p-12 text-gray-500 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            No se encontraron contratistas que coincidan con los filtros aplicados.
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', minWidth: '220px' }}>Contratista</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', minWidth: '180px' }}>Servicio</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Dependencia</th>
                                        {matrixData.columns?.map(col => (
                                            <th key={col.key} style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.rows?.map(row => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 500, color: '#1e293b' }}>{row.contratista}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RUT: {row.rut}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#1e293b' }}>{row.servicio}</td>
                                            <td style={{ padding: '12px 16px', color: '#1e293b' }}>{row.dependencia}</td>
                                            {matrixData.columns?.map(col => {
                                                const cell = row.data[col.key];
                                                if (!cell) {
                                                    return <td key={`${row.id}-${col.key}`} style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>N/A</td>;
                                                }
                                                const finalScore = cell.auditado !== null ? cell.auditado : cell.declarado;
                                                const scoreNum = parseFloat(finalScore);
                                                let bgColor = '#f8fafc';
                                                let textColor = '#64748b';
                                                
                                                if (!isNaN(scoreNum)) {
                                                    if (scoreNum >= 85) { bgColor = '#dcfce7'; textColor = '#166534'; }
                                                    else if (scoreNum >= 70) { bgColor = '#fef3c7'; textColor = '#92400e'; }
                                                    else if (scoreNum > 0) { bgColor = '#fee2e2'; textColor = '#b91c1c'; }
                                                }

                                                return (
                                                    <td key={`${row.id}-${col.key}`} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ 
                                                            display: 'inline-block', padding: '4px 10px', 
                                                            borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600,
                                                            backgroundColor: bgColor, color: textColor
                                                        }}>
                                                            {finalScore}%
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!loadingMatrix && matrixData.rows?.length > 0 && (
                        <div style={{
                            padding: '1rem 1.5rem',
                            background: '#fff',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '1rem'
                        }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                Mostrando <span style={{ fontWeight: 600, color: '#1e293b' }}>{(page - 1) * pagination.limit + 1}</span> a <span style={{ fontWeight: 600, color: '#1e293b' }}>{Math.min(page * pagination.limit, pagination.total)}</span> de <span style={{ fontWeight: 600, color: '#1e293b' }}>{pagination.total}</span> registros
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loadingMatrix}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: '#fff',
                                        color: page === 1 ? '#cbd5e1' : '#475569',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Anterior
                                </button>

                                {/* Page Numbers */}
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1))
                                    .map((p, i, arr) => (
                                        <Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '0 8px', color: '#cbd5e1' }}>...</span>}
                                            <button
                                                onClick={() => setPage(p)}
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid',
                                                    borderColor: page === p ? '#3b82f6' : '#e2e8f0',
                                                    borderRadius: '8px',
                                                    background: page === p ? '#eff6ff' : '#fff',
                                                    color: page === p ? '#003594' : '#475569',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    minWidth: '36px'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        </Fragment>
                                    ))}

                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages || loadingMatrix}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: '#fff',
                                        color: page === pagination.totalPages ? '#cbd5e1' : '#475569',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* TAB: Pendientes */}
            {activeTab === 'pendientes' && (
                <div className="dashboard-section-card">
                    <div className="section-title-wrapper mb-6">
                        <h3 className="section-title">
                            <AlertTriangle size={22} color="#ef4444" />
                            Acciones de Atención Prioritaria
                        </h3>
                    </div>
                    
                    {kpis?.hallazgosAbiertos === 0 && kpis?.compromisosVencidos === 0 && kpis?.pendientesAuditoria === 0 ? (
                        <div className="text-center p-12 text-gray-500 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
                            ¡Excelente! No existen pendientes vencidos, carpetas impagas o hallazgos críticos en el perímetro seleccionado.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <h4 style={{ color: '#b91c1c', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={20} /> Hallazgos Abiertos
                                </h4>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{kpis.hallazgosAbiertos || 0}</div>
                                <p style={{ marginTop: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>Puntos críticos detectados en auditorías que requieren cierre obligatorio con el contratista.</p>
                            </div>

                            <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                <h4 style={{ color: '#92400e', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={20} /> Compromisos Vencidos
                                </h4>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{kpis.compromisosVencidos || 0}</div>
                                <p style={{ marginTop: '0.5rem', color: '#92400e', fontSize: '0.875rem' }}>Fechas límite superadas en compromisos de mejora contínua acordados entre partes.</p>
                            </div>

                            <div style={{ padding: '1.5rem', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <h4 style={{ color: '#1d4ed8', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={20} /> Pendientes de Auditoría
                                </h4>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{kpis.pendientesAuditoria || 0}</div>
                                <p style={{ marginTop: '0.5rem', color: '#1e40af', fontSize: '0.875rem' }}>Carpetas EECC entregadas y declaradas a la espera del proceso de QA del auditor.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

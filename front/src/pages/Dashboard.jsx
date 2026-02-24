// IEEE Trace: REQ-010 | US-008 | pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
    AlertTriangle,
    TrendingUp
} from 'lucide-react';
import ComplianceChart from '../components/charts/ComplianceChart';
import ElementComplianceWidget from '../components/dashboard/ElementComplianceWidget';
import RecordsSummaryWidget from '../components/dashboard/RecordsSummaryWidget';


export default function Dashboard() {
    const { user, isAdmin } = useAuth();
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
    const [vinculaciones, setVinculaciones] = useState([]); // Parko: Store links
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [progRes, servRes, depRes, vincRes, histRes] = await Promise.all([
                    api.get('/programas'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/resources/dependencias'),
                    api.get('/vinculaciones'), // Parko: Fetch active assignments
                    api.get('/dashboard/historico') // Parko: Fetch history
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

    // Filter dependencies based on selected service
    const filteredDependencies = filters.servicio_id === 'todos'
        ? dependencies
        : dependencies.filter(dep =>
            vinculaciones.some(v =>
                String(v.servicio_id) === String(filters.servicio_id) &&
                String(v.dependencia_id) === String(dep.id)
            )
        );


    // Fetch KPIs when filters change (debounced or manual apply? User usually expects auto or "Apply" button. Auto for now except search)
    // Actually, let's trigger on change for dropdowns, debounce for text.
    // For simplicity, let's keep it manual or effect-based.
    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchKpis();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters]);

    const fetchKpis = async () => {
        try {
            // Build query
            const params = new URLSearchParams();
            if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
            if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
            if (filters.search) params.append('search', filters.search);
            if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);

            const response = await api.get(`/dashboard/kpis?${params.toString()}`);
            setKpis(response.data.data);
            setLoading(false); // Ensure loading is off
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

    // Role-specific Labeling
    const kpiTitle = isContractor ? 'Mi Gestión (KPIs)' : 'Monitor Global';

    // Calculate % Auditados
    const pctAuditados = kpis?.totalRegistros > 0
        ? Math.round((kpis.auditados / kpis.totalRegistros) * 100)
        : 0;

    const kpiData = kpis ? [
        {
            title: 'CUMPLIMIENTO GENERAL',
            value: `${kpis.promedioCumplimiento}%`,
            subtitle: 'Promedio del periodo',
            color: '#10b981', // Green
        },
        {
            title: '% AUDITADOS',
            value: `${pctAuditados}%`,
            subtitle: `Terreno: ${kpis.auditadosTerreno || 0} | Sistema: ${kpis.auditadosSistema || 0}`,
            color: '#3b82f6', // Blue
        },
        {
            title: 'EVIDENCIAS',
            value: kpis.totalEvidencias || 0,
            subtitle: 'Total subidas',
            color: '#8b5cf6', // Purple
        },
        {
            title: 'HALLAZGOS ABIERTOS',
            value: kpis.hallazgosAbiertos,
            subtitle: 'Requieren atención',
            color: '#ef4444', // Red
        },
        {
            title: 'REGISTROS',
            value: kpis.totalRegistros,
            subtitle: 'En periodo seleccionado',
            color: '#374151', // Gray
        }
    ] : [];

    if (loading) return <div className="loading">Cargando dashboard...</div>;

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <span className="subtitle">{kpiTitle}</span>
                </div>
                <div className="user-badge column-right">
                    <strong>{user?.name}</strong>
                    <span>{user?.role?.replace('_', ' ').toUpperCase()}</span>
                    {user?.eecc_nombre && <small>{user.eecc_nombre}</small>}
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            {/* Filter Bar */}
            <div className="dashboard-filters" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Periodo Inicio</label>
                        <input
                            type="month"
                            className="form-control"
                            style={{ width: '100%' }}
                            value={filters.fecha_inicio}
                            onChange={(e) => handleFilterChange('fecha_inicio', e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Periodo Fin</label>
                        <input
                            type="month"
                            className="form-control"
                            style={{ width: '100%' }}
                            value={filters.fecha_fin}
                            onChange={(e) => handleFilterChange('fecha_fin', e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Buscar</label>
                        <input
                            type="text"
                            placeholder="Nombre, RUT..."
                            className="form-control"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Programa</label>
                        <select
                            className="form-control"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                            value={filters.programa_id}
                            onChange={(e) => handleFilterChange('programa_id', e.target.value)}
                        >
                            <option value="todos">Todos</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Servicio</label>
                        <select
                            className="form-control"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                            value={filters.servicio_id}
                            onChange={(e) => handleFilterChange('servicio_id', e.target.value)}
                        >
                            <option value="todos">Todos</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Dependencia</label>
                        <select
                            className="form-control"
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                            value={filters.dependencia_id}
                            onChange={(e) => handleFilterChange('dependencia_id', e.target.value)}
                        >
                            <option value="todas">Todas</option>
                            {filteredDependencies.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>

                </div>
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                    <button
                        onClick={clearFilters}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* NEW KPI SECTION (Vertical Stack Style applied to Grid) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                {kpiData.map((kpi, index) => (
                    <div key={index} id={`kpi-card-${index}`} className="kpi-card" style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        borderLeft: `4px solid ${kpi.color}`,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <span style={{
                            color: '#6b7280',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                            marginBottom: '8px'
                        }}>
                            {kpi.title}
                        </span>
                        <span style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: kpi.color,
                            marginBottom: '4px',
                            lineHeight: '1.2'
                        }}>
                            {kpi.value}
                        </span>
                        <span style={{
                            color: '#9ca3af',
                            fontSize: '12px'
                        }}>
                            {kpi.subtitle}
                        </span>
                    </div>
                ))}
            </div>

            {/* US-1.13: Leyenda de Semáforos */}
            <div className="dashboard-legend" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    <span>Cumplimiento Óptimo ({'>'}85%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                    <span>Atención Requerida</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                    <span>Crítico ({'<'}70%)</span>
                </div>
            </div>

            {/* US-1.1: Tendencia Histórica */}
            <div className="dashboard-chart-section" style={{ marginTop: '2rem', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>Evolución de Cumplimiento (Últimos 6 meses)</h3>
                    {/* Placeholder for future filter */}
                </div>

                {/* Real Data Integration - US-1.1 */}
                <ComplianceChart data={historyData} />
            </div>




            {/* US-X: Cumplimiento por Elemento */}
            <ElementComplianceWidget period={filters.fecha_fin || new Date().toISOString().slice(0, 7)} />

            {/* US-X: Resumen de Registros */}
            <RecordsSummaryWidget period={filters.fecha_fin || new Date().toISOString().slice(0, 7)} />

        </div>
    );
}

// IEEE Trace: REQ-010 | US-008 | pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
    FileText,
    Users,
    ClipboardCheck,
    TrendingUp,
    AlertTriangle,
    CheckSquare,
    RefreshCw,
    FileWarning,

    Download
} from 'lucide-react';
import ComplianceChart from '../components/charts/ComplianceChart';

export default function Dashboard() {
    const { user, isAdmin } = useAuth();
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchKpis();
    }, []);

    const fetchKpis = async () => {
        try {
            const response = await api.get('/dashboard/kpis');
            setKpis(response.data.data);
        } catch (err) {
            setError('Error al cargar métricas');
        } finally {
            setLoading(false);
        }
    };

    const isContractor = ['contratista_admin', 'contratista_user'].includes(user?.role);
    const isAdminContrato = user?.role === 'administrador_contrato';

    // Role-specific Labeling
    const kpiTitle = isContractor ? 'Mi Gestión (KPIs)' : 'Monitor Global';

    const kpiCards = kpis ? [
        {
            label: isContractor ? 'Mis Registros Pendientes' : 'Registros Pendientes',
            value: kpis.pendientesAuditoria,
            icon: FileText,
            color: '#f59e0b'
        },
        {
            label: 'Registros Auditados',
            value: kpis.auditados,
            icon: ClipboardCheck,
            color: '#10b981'
        },
        {
            label: '% Cumplimiento',
            value: `${kpis.promedioCumplimiento}%`,
            icon: TrendingUp,
            color: parseFloat(kpis.promedioCumplimiento) >= 85 ? '#10b981' : (parseFloat(kpis.promedioCumplimiento) >= 70 ? '#f59e0b' : '#ef4444')
        },
        {
            label: 'Compromisos Vencidos',
            value: kpis.compromisosVencidos,
            icon: AlertTriangle,
            color: kpis.compromisosVencidos > 0 ? '#ef4444' : '#6b7280'
        },
        // Only show Hallazgos/Reaperturas if relevant
        {
            label: 'Hallazgos Abiertos',
            value: kpis.hallazgosAbiertos,
            icon: FileWarning,
            color: kpis.hallazgosAbiertos > 0 ? '#f59e0b' : '#6b7280'
        },
        // Reaperturas: Important for both (Contractor requests, Admin approves)
        {
            label: isContractor ? 'Mis Solicitudes Pendientes' : 'Solicitudes de Reapertura',
            value: kpis.reapeturasPendientes,
            icon: RefreshCw,
            color: kpis.reapeturasPendientes > 0 ? '#3b82f6' : '#6b7280'
        },
    ] : [];

    // Add extra KPIs for Admin
    if (!isContractor && kpis) {
        kpiCards.push({
            label: 'Usuarios Activos',
            value: kpis.usuariosActivos,
            icon: Users,
            color: '#10b981'
        });
        kpiCards.push({
            label: 'Total Registros',
            value: kpis.totalRegistros,
            icon: CheckSquare,
            color: '#0066cc'
        });
    }

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

            <div className="kpi-grid">
                {kpiCards.map((kpi, index) => (
                    <div key={index} id={`kpi-card-${index}`} className="kpi-card" style={{ borderLeftColor: kpi.color }}>
                        <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20` }}>
                            <kpi.icon size={24} color={kpi.color} />
                        </div>
                        <div className="kpi-content">
                            <span className="kpi-value">{kpi.value}</span>
                            <span className="kpi-label">{kpi.label}</span>
                        </div>
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

                {/* Mock Data for now - Backend Task 19 will provide real data */}
                <ComplianceChart data={[
                    { name: 'Ago', cumplimiento: 78 },
                    { name: 'Sep', cumplimiento: 82 },
                    { name: 'Oct', cumplimiento: 85 },
                    { name: 'Nov', cumplimiento: 88 },
                    { name: 'Dic', cumplimiento: 92 },
                    { name: 'Ene', cumplimiento: kpis?.promedioCumplimiento || 90 }
                ]} />
            </div>

            <div className="dashboard-sections">
                <section className="dashboard-section">
                    <h2>Acciones Rápidas</h2>
                    <div className="quick-actions">
                        <a href="/registros" className="action-card">
                            <FileText size={32} />
                            <span>{isContractor ? 'Mis Registros' : 'Gestión Registros'}</span>
                        </a>
                        <a href="/compromisos" className="action-card">
                            <CheckSquare size={32} />
                            <span>{isContractor ? 'Mis Compromisos' : 'Monitor Compromisos'}</span>
                        </a>

                        {/* Admin / Admin Contrato Specifics */}
                        {(isAdmin || isAdminContrato) && (
                            <>
                                <a href="/reaperturas" className="action-card">
                                    <RefreshCw size={32} />
                                    <span>Gestionar Reaperturas</span>
                                </a>
                                <a href="/programas" className="action-card">
                                    <ClipboardCheck size={32} />
                                    <span>Configurar Programas</span>
                                </a>
                            </>
                        )}

                        {/* Contractor Specifics */}
                        {isContractor && (
                            <a href="/reaperturas" className="action-card">
                                <RefreshCw size={32} />
                                <span>Mis Solicitudes</span>
                            </a>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

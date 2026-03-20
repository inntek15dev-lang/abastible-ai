import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
    AlertTriangle, 
    CheckCircle2, 
    FileText, 
    Clock, 
    ArrowRight,
    Search,
    Calendar,
    Filter,
    Building2
} from 'lucide-react';
import './Dashboard.css'; // Reuse dashboard styles for consistency

export default function Pendientes() {
    const { user } = useAuth();
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchKpis();
    }, []);

    const fetchKpis = async () => {
        try {
            setLoading(true);
            const response = await api.get('/dashboard/kpis');
            setKpis(response.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Error al cargar pendientes');
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="dashboard-page">
            <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '1rem' }} />
            <div className="kpi-grid">
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />)}
            </div>
        </div>
    );

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div>
                    <h1>Pendientes de Acción</h1>
                    <span className="subtitle">Tareas críticas y seguimientos que requieren tu atención</span>
                </div>
            </header>

            {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

            <div className="kpi-grid">
                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#fef2f2' }}>
                        <AlertTriangle size={20} color="#ef4444" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">HALLAZGOS ABIERTOS</span>
                        <span className="kpi-card-value" style={{ color: '#ef4444' }}>{kpis?.hallazgosAbiertos || 0}</span>
                        <span className="kpi-card-subtitle">Requieren subsanación inmediata</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                        <Clock size={20} color="#f59e0b" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">COMPROMISOS VENCIDOS</span>
                        <span className="kpi-card-value" style={{ color: '#f59e0b' }}>{kpis?.compromisosVencidos || 0}</span>
                        <span className="kpi-card-subtitle">Plazos de mejora superados</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#eff6ff' }}>
                        <FileText size={20} color="#3b82f6" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">POR AUDITAR</span>
                        <span className="kpi-card-value" style={{ color: '#3b82f6' }}>{kpis?.pendientesAuditoria || 0}</span>
                        <span className="kpi-card-subtitle">Carpetas enviadas en espera</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-section-card" style={{ marginTop: '2rem' }}>
                <div className="section-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title">
                        <Filter size={20} color="#6366f1" />
                        Próximos Pasos y Alertas
                    </h3>
                    <button className="btn-primary" onClick={() => window.location.href = '/registros/nuevo'}>
                        + Nuevo Registro
                    </button>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    {kpis?.hallazgosAbiertos === 0 && kpis?.compromisosVencidos === 0 && kpis?.pendientesAuditoria === 0 ? (
                        <div className="text-center p-12 text-gray-500 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
                            <p>¡Buen trabajo! No tienes acciones pendientes críticas en este momento.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {kpis?.hallazgosAbiertos > 0 && (
                                <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle color="#ef4444" size={20} />
                                        <div>
                                            <div className="font-bold text-red-800">Hay hallazgos críticos sin cerrar</div>
                                            <div className="text-sm text-red-600">Revisa la Matriz de Cumplimiento para identificar las EECC afectadas.</div>
                                        </div>
                                    </div>
                                    <button className="p-2 hover:bg-red-100 rounded-full transition-colors">
                                        <ArrowRight size={18} color="#ef4444" />
                                    </button>
                                </div>
                            )}

                            {kpis?.pendientesAuditoria > 0 && (
                                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText color="#3b82f6" size={20} />
                                        <div>
                                            <div className="font-bold text-blue-800">Registros pendientes de validación</div>
                                            <div className="text-sm text-blue-600">Tienes {kpis.pendientesAuditoria} carpetas que requieren revisión de terreno o sistema.</div>
                                        </div>
                                    </div>
                                    <button className="p-2 hover:bg-blue-100 rounded-full transition-colors" onClick={() => window.location.href = '/registros'}>
                                        <ArrowRight size={18} color="#3b82f6" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

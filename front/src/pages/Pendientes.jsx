import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    Building2,
    Check,
    X,
    User,
    ClipboardIcon,
    ArrowUpRight,
    AlertCircle,
    PlusCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import './Dashboard.css';

export default function Pendientes() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [kpis, setKpis] = useState(null);
    const [solicitudes, setSolicitudes] = useState([]);
    const [porAuditar, setPorAuditar] = useState([]);
    const [porRevisar, setPorRevisar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vinculaciones, setVinculaciones] = useState([]);
    const [pendientesCreacion, setPendientesCreacion] = useState([]);
    
    // Modal state for Reopening Requests
    const [actionModal, setActionModal] = useState({ show: false, solicitud: null, type: '' });
    const [responseText, setResponseText] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');

    const calculatePendingPeriods = (vincs, allRegs) => {
        const pending = [];
        const now = new Date();
        
        vincs.forEach(v => {
            if (!v.fecha_inicio_contrato) return;
            
            let current = new Date(v.fecha_inicio_contrato);
            // Reset to first day of month
            current = new Date(current.getFullYear(), current.getMonth(), 1);
            
            while (current <= now) {
                const year = current.getFullYear();
                const month = String(current.getMonth() + 1).padStart(2, '0');
                const periodStr = `${year}-${month}`;
                
                const exists = allRegs.some(r => r.periodo && r.periodo.startsWith(periodStr) && r.vinculacion_id === v.id);
                
                if (!exists) {
                    pending.push({
                        periodo: periodStr,
                        date: new Date(current),
                        vinculacion: v
                    });
                }
                
                current.setMonth(current.getMonth() + 1);
            }
        });
        
        setPendientesCreacion(pending.sort((a, b) => a.date - b.date));
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const auditParams = isAdminOrADC 
                ? 'pendiente,auditando' 
                : 'pendiente,auditando,abierto,reabierto';
            const reviewParams = isAdminOrADC 
                ? 'subsanado,en_revision' 
                : 'pendiente_subsanacion,subsanado,en_revision';

            const promises = [
                api.get('/dashboard/kpis'),
                api.get('/reaperturas?estado=pendiente'),
                api.get(`/registros?estado_auditoria=${auditParams}`),
                api.get(`/registros?estado_auditoria=${reviewParams}`)
            ];

            // If contractor, also fetch vinculaciones and full registry history to find gaps
            if (!isAdminOrADC) {
                promises.push(api.get('/vinculaciones'));
                promises.push(api.get('/registros')); // Full history for the contractor
            }

            const results = await Promise.all(promises);
            
            const [kpiRes, solRes, auditRes, reviewRes] = results;

            setKpis(kpiRes.data.data);
            setSolicitudes(solRes.data.data);
            setPorAuditar(auditRes.data.data);
            setPorRevisar(reviewRes.data.data);

            if (!isAdminOrADC && results[4] && results[5]) {
                const vincs = results[4].data.data;
                const allRegs = results[5].data.data;
                setVinculaciones(vincs);
                calculatePendingPeriods(vincs, allRegs);
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos pendientes');
            setLoading(false);
        }
    };

    const handleProcessSolicitud = async () => {
        if (actionModal.type === 'rechazar' && !responseText) {
            toast.error('Debe proporcionar el motivo del rechazo');
            return;
        }

        try {
            const endpoint = `/reaperturas/${actionModal.solicitud.id}/${actionModal.type}`;
            await api.put(endpoint, {
                respuesta: responseText,
                fecha_limite: fechaLimite
            });
            
            toast.success(`Solicitud ${actionModal.type === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`);
            setActionModal({ show: false, solicitud: null, type: '' });
            setResponseText('');
            setFechaLimite('');
            fetchAllData();
        } catch (err) {
            toast.error('Error al procesar la solicitud');
        }
    };

    const isAdminOrADC = user?.role === 'admin' || user?.role === 'administrador_contrato';

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
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ backgroundColor: '#6366f1', padding: '12px', borderRadius: '12px', color: 'white' }}>
                        <ClipboardIcon size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0 }}>Pendientes de Acción</h1>
                        <span className="subtitle" style={{ color: '#6b7280', fontSize: '0.95rem' }}>Gestión de solicitudes y validación de registros</span>
                    </div>
                </div>
            </header>

            {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

            {/* KPIs Summary */}
            <div className="kpi-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                        <Clock size={20} color="#f59e0b" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">SOLICITUDES REAPERTURA</span>
                        <span className="kpi-card-value" style={{ color: '#f59e0b' }}>{solicitudes.length}</span>
                        <span className="kpi-card-subtitle">Pendientes de aprobación</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#eff6ff' }}>
                        <FileText size={20} color="#3b82f6" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">POR AUDITAR</span>
                        <span className="kpi-card-value" style={{ color: '#3b82f6' }}>{porAuditar.length}</span>
                        <span className="kpi-card-subtitle">Nuevas carpetas entregadas</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#f5f3ff' }}>
                        <CheckCircle2 size={20} color="#8b5cf6" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">REVISIÓN SUBSANACIÓN</span>
                        <span className="kpi-card-value" style={{ color: '#8b5cf6' }}>{porRevisar.length}</span>
                        <span className="kpi-card-subtitle">Correcciones listas para validar</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
                
                {/* 1. Solicitudes de Reapertura - Solo Admin/ADC */}
                {isAdminOrADC && (
                    <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#fffbeb', p: '8px', borderRadius: '8px' }}>
                                <Clock size={20} color="#f59e0b" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Solicitudes de Reapertura</h3>
                        </div>

                        {solicitudes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>No hay solicitudes pendientes.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {solicitudes.map(sol => (
                                    <div key={sol.id} style={{ 
                                        padding: '1.25rem', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #e5e7eb',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>EECC</span>
                                                <span style={{ fontWeight: 600, color: '#111827' }}>{sol.registro?.eecc_nombre}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Periodo</span>
                                                <span style={{ color: '#374151' }}>{new Date(sol.registro?.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <div style={{ maxWidth: '300px' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Motivo</span>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.4 }}>{sol.motivo}</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => setActionModal({ show: true, solicitud: sol, type: 'aprobar' })}
                                                className="btn-success" 
                                                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                            >
                                                <Check size={16} /> Aprobar
                                            </button>
                                            <button 
                                                onClick={() => setActionModal({ show: true, solicitud: sol, type: 'rechazar' })}
                                                className="btn-danger" 
                                                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                            >
                                                <X size={16} /> Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* 2. Registros Pendientes de Creación - Solo Contratistas */}
                {!isAdminOrADC && pendientesCreacion.length > 0 && (
                    <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#fff7ed', p: '8px', borderRadius: '8px' }}>
                                <AlertCircle size={20} color="#f97316" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Registros Pendientes de Creación</h3>
                            <span style={{ backgroundColor: '#f97316', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{pendientesCreacion.length}</span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>SERVICIO / DEPENDENCIA</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendientesCreacion.map((item, idx) => (
                                        <tr key={`${item.periodo}-${idx}`} style={{ borderBottom: '1px solid #f9fafb' }}>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ fontWeight: 600, color: '#f97316', textTransform: 'capitalize' }}>
                                                    {item.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ color: '#374151', fontWeight: 500 }}>{item.vinculacion?.servicio?.nombre}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.vinculacion?.dependencia?.nombre}</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => navigate(`/registros/new?periodo=${item.periodo}&vinculacion_id=${item.vinculacion.id}`)}
                                                    style={{ 
                                                        backgroundColor: '#f97316', color: 'white', border: 'none', 
                                                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                    }}
                                                >
                                                    <PlusCircle size={14} /> Crear Registro
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* 2. Registros por Auditar */}
                <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#eff6ff', p: '8px', borderRadius: '8px' }}>
                            <FileText size={20} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Registros Pendientes de Auditoría</h3>
                    </div>

                    {porAuditar.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>No hay registros por auditar.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>EECC / NOMBRE</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO / PROGRAMA</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>ESTADO</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {porAuditar.map(reg => (
                                        <tr key={reg.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background-color 0.2s' }}>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ fontWeight: 600, color: '#111827' }}>{reg.eecc_nombre}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: #{reg.id}</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ color: '#374151' }}>{new Date(reg.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>{reg.programa?.nombre}</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                    backgroundColor: reg.estado_auditoria === 'auditando' ? '#fef3c7' : '#f0f9ff',
                                                    color: reg.estado_auditoria === 'auditando' ? '#92400e' : '#0284c7'
                                                }}>
                                                    {reg.estado_auditoria === 'auditando' ? 'EN PROCESO' : 'POR AUDITAR'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                {isAdminOrADC ? (
                                                    <button 
                                                        onClick={() => navigate(`/registros/${reg.id}/auditar`)}
                                                        style={{ 
                                                            backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', 
                                                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                        }}
                                                    >
                                                        Iniciar Auditoría <ArrowUpRight size={14} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            const isEditable = ['abierto', 'reabierto'].includes(reg.estado_auditoria);
                                                            navigate(`/registros/${reg.id}`, { state: isEditable ? {} : { readonly: true } });
                                                        }}
                                                        style={{ 
                                                            backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', 
                                                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                        }}
                                                    >
                                                        {['abierto', 'reabierto'].includes(reg.estado_auditoria) ? <>Editar <ArrowRight size={14} /></> : <>Ver <ArrowRight size={14} /></>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* 3. Revisión de Subsanación */}
                <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#f5f3ff', p: '8px', borderRadius: '8px' }}>
                            <CheckCircle2 size={20} color="#8b5cf6" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Pendientes de Revisión (Subsanados)</h3>
                    </div>

                    {porRevisar.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>No hay registros por revisar.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>EECC / NOMBRE</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO / PROGRAMA</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>AVANCE</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {porRevisar.map(reg => (
                                        <tr key={reg.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ fontWeight: 600, color: '#111827' }}>{reg.eecc_nombre}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: #{reg.id}</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <div style={{ color: '#374151' }}>{new Date(reg.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>{reg.programa?.nombre}</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{reg.porcentaje_cumplimiento}%</div>
                                                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>DECLARADO</div>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                {isAdminOrADC ? (
                                                    <button 
                                                        onClick={() => navigate(`/registros/${reg.id}/auditar`)}
                                                        style={{ 
                                                            backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', 
                                                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                        }}
                                                    >
                                                        Revisar <CheckCircle2 size={14} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            const isEditable = reg.estado_auditoria === 'pendiente_subsanacion';
                                                            navigate(`/registros/${reg.id}`, { state: isEditable ? {} : { readonly: true } });
                                                        }}
                                                        style={{ 
                                                            backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', 
                                                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                        }}
                                                    >
                                                        {reg.estado_auditoria === 'pendiente_subsanacion' ? <>Editar <ArrowRight size={14} /></> : <>Ver <ArrowRight size={14} /></>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Modal for Reapertura Processing */}
            {actionModal.show && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
                }}>
                    <div style={{ 
                        backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', 
                        width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                    }}>
                        <h2 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: actionModal.type === 'aprobar' ? '#10b981' : '#ef4444' }}>
                            {actionModal.type === 'aprobar' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                            {actionModal.type === 'aprobar' ? 'Aprobar Reapertura' : 'Rechazar Reapertura'}
                        </h2>
                        
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Estás por {actionModal.type} la solicitud para el registro de <strong>{actionModal.solicitud?.registro?.eecc_nombre}</strong> ({new Date(actionModal.solicitud?.registro?.periodo).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}).
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                {actionModal.type === 'aprobar' ? 'Respuesta / Instrucciones' : 'Motivo del Rechazo *'}
                            </label>
                            <textarea 
                                className="form-control"
                                rows={4}
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder={actionModal.type === 'aprobar' ? "Ej: Aprobado para corrección de dotación." : "Ej: El motivo no justifica la reapertura del periodo cerrado."}
                                style={{ borderRadius: '8px', padding: '0.75rem' }}
                            />
                        </div>

                        {actionModal.type === 'aprobar' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                    Fecha Límite para Subsanación (Opcional)
                                </label>
                                <input 
                                    type="date"
                                    className="form-control"
                                    value={fechaLimite}
                                    onChange={(e) => setFechaLimite(e.target.value)}
                                    style={{ borderRadius: '8px' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setActionModal({ show: false, solicitud: null, type: '' })}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleProcessSolicitud}
                                style={{ 
                                    padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', 
                                    background: actionModal.type === 'aprobar' ? '#10b981' : '#ef4444', 
                                    color: 'white', cursor: 'pointer', fontWeight: 600 
                                }}
                            >
                                Confirmar {actionModal.type}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

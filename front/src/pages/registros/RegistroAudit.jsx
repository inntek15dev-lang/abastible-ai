// IEEE Trace: REQ-003 | US-003 | pages/registros/RegistroAudit.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
    ArrowLeft,
    Check,
    X,
    AlertTriangle,
    Save,
    Download,
    FileText,
    Monitor,
    Building,
    Shield,
    Plus,
    Trash,
    FileImage,
    FileSpreadsheet,
    FileVideo,
    FileAudio,
    FileBox,
    Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function RegistroAudit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, canWrite } = useAuth();

    const [registro, setRegistro] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [comentarioGeneral, setComentarioGeneral] = useState('');

    // For Audit Form State (Local mutations before save)
    const [auditState, setAuditState] = useState({}); // { activityId: { cumple: bool, observacion: str } }

    // Commitments State
    const [compromisos, setCompromisos] = useState([]);
    const [nuevoCompromiso, setNuevoCompromiso] = useState({ descripcion: '', fecha_compromiso: '' });
    const [loadingCompromisos, setLoadingCompromisos] = useState(false);

    useEffect(() => {
        fetchRegistro();
    }, [id]);

    const fetchRegistro = async () => {
        try {
            const response = await api.get(`/registros/${id}`);
            setRegistro(response.data.data);
            setComentarioGeneral(response.data.data.comentario_general || '');

            // Initialize local audit state
            const initialAuditState = {};
            response.data.data.actividades?.forEach(act => {
                initialAuditState[act.id] = {
                    cumple: act.cumple_auditor === null ? null : (act.cumple_auditor === 1 || act.cumple_auditor === true || act.cumple_auditor === '1'),
                    observacion: act.observacion_auditor || ''
                };
            });
            setAuditState(initialAuditState);

        } catch (err) {
            setError('Error al cargar registro');
        } finally {
            setLoading(false);
            fetchCompromisos();
        }
    };

    const fetchCompromisos = async () => {
        try {
            setLoadingCompromisos(true);
            const response = await api.get('/compromisos', { params: { registro_id: id } });
            setCompromisos(response.data.data);
        } catch (err) {
            console.error('Error fetching compromisos:', err);
        } finally {
            setLoadingCompromisos(false);
        }
    };

    const handleAddCompromiso = async () => {
        if (!nuevoCompromiso.descripcion || !nuevoCompromiso.fecha_compromiso) {
            alert('Por favor complete la descripción y fecha del compromiso.');
            return;
        }

        try {
            await api.post('/compromisos', {
                registro_id: id,
                descripcion: nuevoCompromiso.descripcion,
                fecha_compromiso: nuevoCompromiso.fecha_compromiso,
                contratista_asignacion_id: registro.contratista_asignacion_id
            });
            setNuevoCompromiso({ descripcion: '', fecha_compromiso: '' });
            fetchCompromisos();
        } catch (err) {
            alert('Error al guardar compromiso');
        }
    };

    const handleDeleteCompromiso = async (compromisoId) => {
        if (!window.confirm('¿Está seguro de eliminar este compromiso?')) return;
        try {
            await api.delete(`/compromisos/${compromisoId}`);
            fetchCompromisos();
        } catch (err) {
            alert('Error al eliminar compromiso');
        }
    };

    const handleIniciarAuditoria = async () => {
        try {
            await api.post(`/registros/${id}/auditar`, { tipo_auditoria: 'sistema' });
            fetchRegistro();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar auditoría');
        }
    };

    const handleLocalAuditChange = (activityId, field, value) => {
        setAuditState(prev => ({
            ...prev,
            [activityId]: {
                ...prev[activityId],
                [field]: value
            }
        }));
    };

    // Bulk save or individual save could be implemented. Here we persist on "Finalizar" or could add specific "Guardar" buttons.
    // For the mockup's interactive feel, we'll keep the direct API calls for "Veredicto" buttons but update local state too.
    const handleAuditarActividad = async (actividadId, cumple_auditor) => {
        // Optimistic update
        handleLocalAuditChange(actividadId, 'cumple', cumple_auditor);

        try {
            await api.put(`/registros/${id}/actividades/${actividadId}/auditar`, {
                cumple_auditor,
                observacion_auditor: auditState[actividadId]?.observacion
            });
            // Background re-fetch or just keep going
        } catch (err) {
            setError('Error al auditar actividad');
            // Revert on error?
        }
    };

    const handleSaveObservation = async (actividadId) => {
        try {
            await api.put(`/registros/${id}/actividades/${actividadId}/auditar`, {
                cumple_auditor: auditState[actividadId]?.cumple,
                observacion_auditor: auditState[actividadId]?.observacion
            });
            // alert('Observación guardada'); // Feedback
        } catch (err) {
            setError('Error al guardar observación');
        }
    };

    const handleFinalizarAuditoria = async () => {
        setSaving(true);
        try {
            await api.post(`/registros/${id}/finalizar-auditoria`, {
                comentario_general: comentarioGeneral
            });
            navigate('/registros');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al finalizar auditoría');
        } finally {
            setSaving(false);
        }
    };

    const downloadEvidencia = async (evidenciaId, nombreOriginal) => {
        try {
            const response = await api.get(`/evidencias/${evidenciaId}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', nombreOriginal);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Error al descargar');
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.text(`Auditoría - ${registro.eecc_nombre}`, 14, 15);
        doc.save(`auditoria_${registro.id}.pdf`);
    };

    // Group Activities by First Number (Element) - Assumes code format "X.Y"
    const groupedActivities = useMemo(() => {
        if (!registro?.actividades) return {};
        const groups = {};
        registro.actividades.forEach(act => {
            const code = act.actividad?.codigo || '0';
            const element = code.split('.')[0];
            if (!groups[element]) groups[element] = [];
            groups[element].push(act);
        });
        return groups;
    }, [registro]);

    if (loading) return <div className="loading">Cargando...</div>;
    if (!registro) return <div className="error-message">Registro no encontrado</div>;

    const isAuditando = registro.estado_auditoria === 'auditando';
    const isPendiente = registro.estado_auditoria === 'pendiente' || registro.estado_auditoria === 'reabierto';
    const isAuditado = ['auditada', 'cerrado'].includes(registro.estado_auditoria);

    // Mock Element Names (Ideally fetch from backend)
    const elementNames = {
        '1': 'LIDERAZGO Y COMPROMISO',
        '2': 'ESTRATEGIA DE RIESGOS',
        '3': 'SEGURIDAD Y SALUD OCUPACIONAL',
        '4': 'REPORTABILIDAD'
    };

    return (
        <div className="page-container audit-page">
            {/* Header */}
            <header className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => navigate(-1)} className="btn-back" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <ArrowLeft size={16} /> Volver
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FileText className="text-orange-500" size={20} />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                                Detalle de Registro - {new Date(registro.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^\w/, c => c.toUpperCase())}
                            </h2>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span className={registro.tipo_auditoria === 'terreno' ? 'badge--audit-terreno' : 'badge--audit-sistema'} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem' }}>
                            {registro.tipo_auditoria === 'terreno' ? <Building size={16} /> : <Monitor size={16} />}
                            {registro.tipo_auditoria === 'terreno' ? 'Terreno' : 'Sistema'}
                        </span>
                        <button onClick={generatePDF} className="btn-primary" style={{ background: '#ef4444' }}>
                            <FileText size={16} /> Exportar PDF
                        </button>
                    </div>
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            {registro.estado_auditoria === 'reapertura_pendiente' && (
                <div style={{
                    background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px',
                    padding: '12px 16px', marginBottom: '16px', display: 'flex',
                    alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '0.9rem'
                }}>
                    ⏳ <strong>Reapertura Pendiente</strong> — Se ha solicitado la reapertura de este registro. Las acciones de auditoría están deshabilitadas hasta que se apruebe o rechace la solicitud.
                </div>
            )}

            {/* Summary Cards */}
            <div className="form-card" style={{ padding: '0', overflow: 'hidden', boxShadow: 'none', background: 'transparent', border: 'none', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                    {/* Row 1 - Main Info */}
                    <div className="summary-card">
                        <div className="summary-label">EECC</div>
                        <div className="summary-value" style={{ fontSize: '1rem' }}>{registro.eecc_nombre}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">DEPENDENCIA</div>
                        <div className="summary-value" style={{ fontSize: '1rem' }}>{registro.dependencia}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">PERIODO</div>
                        <div className="summary-value">{new Date(registro.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">CUMPLIMIENTO</div>
                        <div className="summary-value highlight">{registro.porcentaje_cumplimiento}%</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {/* Row 2 - Stats */}
                    <div className="summary-card" style={{ padding: '1rem' }}>
                        <div className="summary-label">PERSONAS NUEVAS</div>
                        <div className="summary-value">0</div> {/* Mock Data */}
                    </div>
                    <div className="summary-card" style={{ padding: '1rem' }}>
                        <div className="summary-label">SUPERVISORES</div>
                        <div className="summary-value">0</div> {/* Mock Data */}
                    </div>
                    <div className="summary-card" style={{ padding: '1rem' }}>
                        <div className="summary-label">PREVENCIONISTAS</div>
                        <div className="summary-value">0</div> {/* Mock Data */}
                    </div>
                    <div className="summary-card" style={{ padding: '1rem' }}>
                        <div className="summary-label">DOTACIÓN TOTAL</div>
                        <div className="summary-value">{registro.dotacion_total || 0}</div>
                    </div>
                </div>
            </div>

            {/* Audit Panel */}
            <div className="form-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 24px',
                    background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: 600 }}>
                            <Shield size={18} /> Panel de Revisión y Auditoría
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                            PROGRAMA: OIEM DISTRIBUCIÓN GRANEL {/* Hardcoded */}
                        </div>
                    </div>
                    <div>
                        <span className={`badge ${isAuditado ? 'success' : isAuditando ? 'info' : 'warning'}`} style={{ fontSize: '0.85rem' }}>
                            {isAuditando ? 'EN AUDITORÍA' : isAuditado ? 'REGISTRO CERRADO Y AUDITADO' : 'PENDIENTE'}
                        </span>
                    </div>
                </div>

                {isPendiente && canWrite('Auditoria') ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <button id="btn-iniciar-auditoria" className="btn-primary" onClick={handleIniciarAuditoria} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>
                            Iniciar Proceso de Auditoría
                        </button>
                    </div>
                ) : (
                    <table className="data-table" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'white' }}>
                            <tr>
                                <th style={{ width: '150px' }}>ELEMENTO</th>
                                <th style={{ width: '80px' }}>CÓDIGO</th>
                                <th style={{ width: '30%' }}>ACTIVIDAD / DESCRIPCIÓN</th>
                                <th style={{ width: '150px' }}>CONTRATISTA</th>
                                <th style={{ width: '200px' }}>EVIDENCIA</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>AUDITADO?</th>
                                <th style={{ width: '200px' }}>VEREDICTO AUDITOR</th>
                                <th style={{ width: '250px' }}>OBSERVACIÓN / CAUSA RAÍZ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(groupedActivities).length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No hay actividades registradas.</td></tr>
                            )}
                            {Object.keys(groupedActivities).sort().map(elementKey => {
                                const acts = groupedActivities[elementKey];
                                return acts.map((act, idx) => (
                                    <tr key={act.id} className="audit-table-row">
                                        {/* Element grouping cell */}
                                        {idx === 0 && (
                                            <td rowSpan={acts.length} className="audit-group-cell" style={{ borderRight: '1px solid #e5e7eb' }}>
                                                <div style={{ fontSize: '1.5rem', color: '#cbd5e1' }}>{elementKey}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>
                                                    {elementNames[elementKey] || 'ELEMENTO'}
                                                </div>
                                            </td>
                                        )}

                                        {/* Code */}
                                        <td style={{ verticalAlign: 'top' }}>
                                            <span className="badge secondary">{act.actividad?.codigo}</span>
                                        </td>

                                        {/* Activity Details */}
                                        <td style={{ verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{act.actividad?.descripcion}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>
                                                {act.actividad?.verificadores}
                                            </div>

                                            {/* Evidence Logic was here, removing it */}
                                        </td>

                                        {/* Contratista Status */}
                                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                            <div className={`badge ${act.cumple ? 'success' : 'danger'}`} style={{ width: '100%', justifyContent: 'center' }}>
                                                {act.cumple ? '✓ CUMPLE' : 'X NO CUMPLE'}
                                            </div>
                                        </td>

                                        {/* New Evidence Column */}
                                        <td style={{ verticalAlign: 'top' }}>
                                            {act.evidencias?.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {act.evidencias.map((ev, index) => {
                                                        const fileName = ev.nombre_original || ev.nombre_archivo || 'archivo.dat';
                                                        const ext = fileName.split('.').pop().toLowerCase();

                                                        // Icon Selection
                                                        let IconComp = FileText;
                                                        let iconColor = '#6b7280'; // gray

                                                        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
                                                            IconComp = FileImage;
                                                            iconColor = '#3b82f6'; // blue
                                                        } else if (['pdf'].includes(ext)) {
                                                            IconComp = FileText; // specific pdf icon usually red
                                                            iconColor = '#ef4444'; // red
                                                        } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
                                                            IconComp = FileText;
                                                            iconColor = '#2563eb'; // blue-dark
                                                        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                                                            IconComp = FileSpreadsheet;
                                                            iconColor = '#10b981'; // green
                                                        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                                                            IconComp = FileAudio;
                                                            iconColor = '#8b5cf6'; // purple
                                                        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
                                                            IconComp = FileVideo;
                                                            iconColor = '#f59e0b'; // amber
                                                        } else if (['zip', 'rar', '7z'].includes(ext)) {
                                                            IconComp = FileBox;
                                                            iconColor = '#d97706'; // orange
                                                        }

                                                        // Thumbnail Component
                                                        const FileThumbnail = () => (
                                                            <div style={{
                                                                width: '36px', height: '42px',
                                                                border: '1px solid #e5e7eb', borderRadius: '4px',
                                                                background: '#fff',
                                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                position: 'relative', overflow: 'hidden'
                                                            }}>
                                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                                                    <IconComp size={18} color={iconColor} strokeWidth={1.5} />
                                                                </div>
                                                                <div style={{
                                                                    width: '100%',
                                                                    background: iconColor,
                                                                    color: '#fff',
                                                                    fontSize: '0.55rem',
                                                                    fontWeight: 700,
                                                                    textAlign: 'center',
                                                                    textTransform: 'uppercase',
                                                                    lineHeight: '1',
                                                                    padding: '2px 0'
                                                                }}>
                                                                    {ext.substring(0, 4)}
                                                                </div>
                                                            </div>
                                                        );

                                                        return (
                                                            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                                                                <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem', minWidth: '15px' }}>{index + 1}.</span>

                                                                <FileThumbnail />

                                                                <button
                                                                    onClick={() => downloadEvidencia(ev.id, fileName)}
                                                                    className="btn-action"
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        background: '#fff',
                                                                        color: '#334155',
                                                                        border: '1px solid #cbd5e1',
                                                                        padding: '4px 12px',
                                                                        borderRadius: '20px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        cursor: 'pointer',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                                                                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                                                >
                                                                    <Download size={12} /> Ver Evidencia
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>-</span>
                                            )}
                                        </td>

                                        {/* Auditado Check */}
                                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                            {act.cumple_auditor !== null && <Check size={20} className="text-green-500" style={{ margin: '0 auto' }} />}
                                        </td>

                                        {/* Auditor Verdict */}
                                        <td style={{ verticalAlign: 'middle' }}>
                                            {isAuditando && canWrite('Auditoria') ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <button
                                                        onClick={() => handleAuditarActividad(act.id, true)}
                                                        className={`btn-action`}
                                                        style={{
                                                            justifyContent: 'center',
                                                            background: auditState[act.id]?.cumple === true ? '#22c55e' : '#f0fdf4', // Green-500 : Green-50
                                                            color: auditState[act.id]?.cumple === true ? '#ffffff' : '#15803d', // White : Green-700
                                                            border: '1px solid #22c55e',
                                                            transition: 'all 0.2s',
                                                            fontWeight: auditState[act.id]?.cumple === true ? 600 : 400
                                                        }}
                                                    >
                                                        ✓ CUMPLE
                                                    </button>
                                                    <button
                                                        onClick={() => handleAuditarActividad(act.id, false)}
                                                        className={`btn-action`}
                                                        style={{
                                                            justifyContent: 'center',
                                                            background: auditState[act.id]?.cumple === false ? '#ef4444' : '#fef2f2', // Red-500 : Red-50
                                                            color: auditState[act.id]?.cumple === false ? '#ffffff' : '#b91c1c', // White : Red-700
                                                            border: '1px solid #ef4444',
                                                            transition: 'all 0.2s',
                                                            fontWeight: auditState[act.id]?.cumple === false ? 600 : 400
                                                        }}
                                                    >
                                                        X NO CUMPLE
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`badge ${act.cumple_auditor ? 'success' : 'danger'}`} style={{ width: '100%', justifyContent: 'center' }}>
                                                    {act.cumple_auditor ? '✓ CUMPLE' : 'X NO CUMPLE'}
                                                </div>
                                            )}
                                        </td>

                                        {/* Observacion */}
                                        <td style={{ verticalAlign: 'middle' }}>
                                            {isAuditando && canWrite('Auditoria') ? (
                                                <div style={{ position: 'relative' }}>
                                                    <textarea
                                                        className="form-control"
                                                        rows={2}
                                                        style={{ fontSize: '0.8rem', resize: 'vertical' }}
                                                        placeholder={auditState[act.id]?.cumple === false ? "Escriba la causa raíz..." : "Escriba una observación..."}
                                                        value={auditState[act.id]?.observacion}
                                                        onChange={(e) => handleLocalAuditChange(act.id, 'observacion', e.target.value)}
                                                        onBlur={() => handleSaveObservation(act.id)} // Auto-save on blur
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#374151', fontStyle: 'italic' }}>
                                                    {act.observacion_auditor || '-'}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ));
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Comments and Commitments Section */}
            {/* Comments and Commitments Section */}
            {(isAuditando || isAuditado) && (
                <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '32px' }}>

                    {/* Comments Section */}
                    <div className="form-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', fontWeight: 700, marginBottom: '20px' }}>
                            <FileText size={20} /> <span style={{ fontSize: '1.1rem' }}>Comentarios de Auditoría</span>
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
                                Observaciones Generales del Auditor
                            </label>
                            <textarea
                                className="form-control"
                                rows={6}
                                placeholder="Escriba sus conclusiones generales aquí..."
                                value={comentarioGeneral}
                                onChange={(e) => setComentarioGeneral(e.target.value)}
                                disabled={!isAuditando || !canWrite('Auditoria')}
                                style={{
                                    resize: 'none',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Commitments Widget */}
                    <div className="form-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', fontWeight: 700 }}>
                                <Shield size={20} /> <span style={{ fontSize: '1.1rem' }}>Gestión de Compromisos</span>
                            </div>
                            {registro.vinculacionEntidad?.numero_contrato && (
                                <div style={{ textAlign: 'right', background: '#eff6ff', padding: '4px 12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 700 }}>CONTRATO: {registro.vinculacionEntidad.numero_contrato}</span>
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                            {loadingCompromisos ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.9rem' }}>Cargando compromisos...</div>
                            ) : compromisos.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic', border: '1px dashed #e2e8f0', borderRadius: '10px' }}>
                                    No hay compromisos registrados aún
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {compromisos.map((comp) => (
                                        <div
                                            key={comp.id}
                                            style={{
                                                background: '#fff',
                                                border: '1px solid #e2e8f0',
                                                padding: '12px 16px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>{comp.descripcion}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                    <Calendar size={12} /> <span>Vence: {new Date(comp.fecha_compromiso).toLocaleDateString('es-CL')}</span>
                                                </div>
                                            </div>
                                            {isAuditando && canWrite('Auditoria') && (
                                                <button
                                                    onClick={() => handleDeleteCompromiso(comp.id)}
                                                    style={{ color: '#ef4444', background: '#fef2f2', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', marginLeft: '12px' }}
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isAuditando && canWrite('Auditoria') && (
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginTop: '20px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="¿Qué acción se compromete?..."
                                            style={{ fontSize: '0.9rem', borderRadius: '8px', width: '100%' }}
                                            value={nuevoCompromiso.descripcion}
                                            onChange={(e) => setNuevoCompromiso(prev => ({ ...prev, descripcion: e.target.value }))}
                                        />
                                    </div>
                                    <div style={{ flex: '0 0 145px' }}>
                                        <input
                                            type="date"
                                            className="form-control"
                                            style={{ fontSize: '0.9rem', borderRadius: '8px', width: '100%' }}
                                            value={nuevoCompromiso.fecha_compromiso}
                                            onChange={(e) => setNuevoCompromiso(prev => ({ ...prev, fecha_compromiso: e.target.value }))}
                                        />
                                    </div>
                                    <div style={{ flex: '0 0 auto' }}>
                                        <button
                                            className="btn-primary"
                                            onClick={handleAddCompromiso}
                                            style={{
                                                height: '38px',
                                                width: '42px',
                                                padding: 0,
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#2563eb',
                                                border: 'none'
                                            }}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Final Actions */}
            {isAuditando && canWrite('Auditoria') && (
                <div style={{ marginTop: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Revise los datos antes de finalizar el proceso oficial.</span>
                    <button
                        className="btn-primary"
                        onClick={handleFinalizarAuditoria}
                        disabled={saving}
                        style={{ background: '#10b981', padding: '12px 32px', fontSize: '1rem', fontWeight: 600, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                        <Save size={20} />
                        {saving ? 'Cerrando...' : 'Finalizar Auditoría'}
                    </button>
                </div>
            )}
        </div>
    );
}

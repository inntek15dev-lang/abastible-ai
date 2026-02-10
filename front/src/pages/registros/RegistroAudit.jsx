// IEEE Trace: REQ-003 | US-003 | pages/registros/RegistroAudit.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import FileUpload from '../../components/forms/FileUpload';
import {
    ArrowLeft,
    Check,
    X,
    AlertTriangle,
    MessageSquare,
    Save,
    Download,
    Trash2
} from 'lucide-react';

export default function RegistroAudit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, canWrite } = useAuth();

    const [registro, setRegistro] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [comentarioGeneral, setComentarioGeneral] = useState('');

    useEffect(() => {
        fetchRegistro();
    }, [id]);

    const fetchRegistro = async () => {
        try {
            const response = await api.get(`/registros/${id}`);
            setRegistro(response.data.data);
        } catch (err) {
            setError('Error al cargar registro');
        } finally {
            setLoading(false);
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

    const handleAuditarActividad = async (actividadId, cumple_auditor, observacion_auditor) => {
        try {
            await api.put(`/registros/${id}/actividades/${actividadId}/auditar`, {
                cumple_auditor,
                observacion_auditor
            });
            fetchRegistro();
        } catch (err) {
            setError('Error al auditar actividad');
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

    const handleCrearHallazgo = async (actividadId, descripcion) => {
        try {
            await api.post('/hallazgos', {
                registro_id: id,
                registro_actividad_id: actividadId,
                tipo: 'observacion',
                descripcion
            });
            fetchRegistro();
        } catch (err) {
            setError('Error al crear hallazgo');
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

    if (loading) return <div className="loading">Cargando...</div>;
    if (!registro) return <div className="error-message">Registro no encontrado</div>;

    const isAuditando = registro.estado_auditoria === 'auditando';
    const isPendiente = registro.estado_auditoria === 'pendiente';
    const isAuditado = ['auditada_terreno', 'auditada_sistema'].includes(registro.estado_auditoria);

    return (
        <div className="page-container audit-page">
            <header className="page-header">
                <button onClick={() => navigate(-1)} className="btn-back">
                    <ArrowLeft size={18} /> Volver
                </button>
                <h1>Auditar Registro</h1>
                <span className={`badge ${isAuditando ? 'info' : isAuditado ? 'success' : 'warning'}`}>
                    {registro.estado_auditoria}
                </span>
            </header>

            {error && <div className="error-message">{error}</div>}

            {/* Info card */}
            <div className="form-card">
                <div className="audit-info-grid">
                    <div>
                        <strong>EECC:</strong> {registro.eecc_nombre || '-'}
                    </div>
                    <div>
                        <strong>Periodo:</strong> {new Date(registro.periodo).toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}
                    </div>
                    <div>
                        <strong>% Contratista:</strong> {registro.porcentaje_cumplimiento}%
                    </div>
                    <div>
                        <strong>% Auditor:</strong> {registro.porcentaje_cumplimiento_auditor || '-'}%
                    </div>
                </div>
            </div>

            {/* Actions */}
            {isPendiente && canWrite('Auditoria') && (
                <div className="form-actions">
                    <button className="btn-primary" onClick={handleIniciarAuditoria}>
                        Iniciar Auditoría
                    </button>
                </div>
            )}

            {/* Activities */}
            <div className="form-card">
                <h2>Actividades ({registro.actividades?.length || 0})</h2>

                <div className="audit-activities">
                    {registro.actividades?.map((ra) => (
                        <div key={ra.id} className="audit-activity-card">
                            <div className="activity-header">
                                <code>{ra.actividad?.codigo}</code>
                                <span className="activity-desc">{ra.actividad?.descripcion}</span>
                                <div className="activity-status">
                                    <span className={`badge ${ra.cumple ? 'success' : 'danger'}`}>
                                        Contratista: {ra.cumple ? 'Cumple' : 'No cumple'}
                                    </span>
                                    {ra.cumple_auditor !== null && (
                                        <span className={`badge ${ra.cumple_auditor ? 'success' : 'danger'}`}>
                                            Auditor: {ra.cumple_auditor ? 'Cumple' : 'No cumple'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {ra.responsable && (
                                <div className="activity-detail">
                                    <strong>Responsable:</strong> {ra.responsable}
                                </div>
                            )}

                            {ra.descripcion_contratista && (
                                <div className="activity-detail">
                                    <strong>Descripción contratista:</strong> {ra.descripcion_contratista}
                                </div>
                            )}

                            {/* Evidencias */}
                            <div className="evidencias-section">
                                <strong>Evidencias:</strong>
                                {ra.evidencias?.length > 0 ? (
                                    <div className="evidencias-list">
                                        {ra.evidencias.map((ev) => (
                                            <div key={ev.id} className="evidencia-item">
                                                <span>{ev.nombre_original}</span>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => downloadEvidencia(ev.id, ev.nombre_original)}
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="no-evidencias">Sin evidencias</span>
                                )}
                            </div>

                            {/* Audit actions */}
                            {isAuditando && canWrite('Auditoria') && (
                                <div className="audit-actions">
                                    <button
                                        className="btn-audit success"
                                        onClick={() => handleAuditarActividad(ra.id, true, null)}
                                        disabled={ra.cumple_auditor === true}
                                    >
                                        <Check size={16} /> Cumple
                                    </button>
                                    <button
                                        className="btn-audit danger"
                                        onClick={() => handleAuditarActividad(ra.id, false, null)}
                                        disabled={ra.cumple_auditor === false}
                                    >
                                        <X size={16} /> No cumple
                                    </button>
                                    <button
                                        className="btn-audit warning"
                                        onClick={() => {
                                            const desc = prompt('Descripción del hallazgo:');
                                            if (desc) handleCrearHallazgo(ra.id, desc);
                                        }}
                                    >
                                        <AlertTriangle size={16} /> Hallazgo
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hallazgos */}
            {registro.hallazgos?.length > 0 && (
                <div className="form-card">
                    <h2>Hallazgos ({registro.hallazgos.length})</h2>
                    <div className="hallazgos-list">
                        {registro.hallazgos.map((h) => (
                            <div key={h.id} className={`hallazgo-card ${h.tipo}`}>
                                <span className={`badge ${h.tipo === 'no_conformidad' ? 'danger' : 'warning'}`}>
                                    {h.tipo.replace('_', ' ')}
                                </span>
                                <p>{h.descripcion}</p>
                                <span className={`badge ${h.estado === 'cerrado' ? 'success' : 'info'}`}>
                                    {h.estado}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Finalizar */}
            {isAuditando && canWrite('Auditoria') && (
                <div className="form-card">
                    <h2>Finalizar Auditoría</h2>
                    <div className="form-group">
                        <label>Comentario General</label>
                        <textarea
                            value={comentarioGeneral}
                            onChange={(e) => setComentarioGeneral(e.target.value)}
                            rows={3}
                            placeholder="Observaciones generales de la auditoría..."
                        />
                    </div>
                    <div className="form-actions">
                        <button
                            className="btn-primary"
                            onClick={handleFinalizarAuditoria}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Finalizando...' : 'Finalizar Auditoría'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

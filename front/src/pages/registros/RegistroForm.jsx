// IEEE Trace: REQ-002 | US-002 | pages/registros/RegistroForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Save, ArrowLeft, ClipboardCheck, FileText } from 'lucide-react';
import FileUpload from '../../components/forms/FileUpload';
import HallazgoModal from '../../components/forms/HallazgoModal';
import HallazgoList from '../../components/forms/HallazgoList';
import CompromisoModal from '../../components/forms/CompromisoModal';
import SolicitudReaperturaModal from '../../components/forms/SolicitudReaperturaModal';

export default function RegistroForm() {
    const { id } = useParams();
    const { user, canWrite } = useAuth();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        periodo: new Date().toISOString().slice(0, 7), // YYYY-MM format
        personas_nuevas: 0,
        supervisores: 0,
        prevencionistas: 0,
        dotacion_total: 0
    });
    const [actividades, setActividades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hallazgoModal, setHallazgoModal] = useState({ show: false, actividad: null, hallazgo: null });
    const [compromisoModal, setCompromisoModal] = useState({ show: false, hallazgo: null });
    const [reaperturaModal, setReaperturaModal] = useState({ show: false });

    useEffect(() => {
        fetchActividades();
        if (isEdit) {
            fetchRegistro();
        }
    }, [id]);

    const handleCompromisoClick = (hallazgo) => {
        setCompromisoModal({ show: true, hallazgo });
    };

    const handleCompromisoSuccess = (newCompromiso) => {
        // Update local state to reflect the new compromiso
        const updated = actividades.map(a => {
            const hallazgoIndex = a.hallazgos ? a.hallazgos.findIndex(h => h.id === newCompromiso.hallazgo_id) : -1;
            if (hallazgoIndex !== -1) {
                const newHallazgos = [...a.hallazgos];
                // Simplify: just reload activities or hack it in?
                // Proper way: add compromiso to the hallazgo's compromiso list
                const hallazgo = newHallazgos[hallazgoIndex];
                hallazgo.compromisos = [newCompromiso]; // Assuming 1 active commitment
                newHallazgos[hallazgoIndex] = hallazgo;
                return { ...a, hallazgos: newHallazgos };
            }
            return a;
        });
        setActividades(updated);
    };

    const openHallazgoModal = (actividad) => {
        setHallazgoModal({ show: true, actividad });
    };

    const handleHallazgoSuccess = (newHallazgo) => {
        const updated = actividades.map(a => {
            if (a.id === newHallazgo.registro_actividad_id) {
                // Check if update or create
                const existingIndex = a.hallazgos.findIndex(h => h.id === newHallazgo.id);
                let newHallazgos = [...(a.hallazgos || [])];

                if (existingIndex >= 0) {
                    newHallazgos[existingIndex] = newHallazgo;
                } else {
                    newHallazgos.push(newHallazgo);
                }

                return { ...a, hallazgos: newHallazgos };
            }
            return a;
        });
        setActividades(updated);
    };

    const handleHallazgoEdit = (hallazgo, actividad) => {
        setHallazgoModal({ show: true, actividad, hallazgo });
    };

    const handleHallazgoDelete = async (hallazgoId, actividadId) => {
        if (!window.confirm('¿Está seguro de eliminar este hallazgo?')) return;
        try {
            await api.delete(`/hallazgos/${hallazgoId}`);
            const updated = actividades.map(a => {
                if (a.id === actividadId) {
                    return {
                        ...a,
                        hallazgos: a.hallazgos.filter(h => h.id !== hallazgoId)
                    };
                }
                return a;
            });
            setActividades(updated);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar hallazgo');
        }
    };

    const fetchActividades = async () => {
        try {
            const response = await api.get('/actividades');
            const acts = response.data.data.map(a => ({
                actividad_id: a.id,
                codigo: a.codigo,
                descripcion: a.descripcion,
                cumple: false,
                responsable: '',
                descripcion_contratista: ''
            }));
            setActividades(acts);
        } catch (err) {
            console.error('Error loading actividades');
        }
    };

    const fetchRegistro = async () => {
        try {
            const response = await api.get(`/registros/${id}`);
            const data = response.data.data;
            setForm({
                periodo: data.periodo,
                personas_nuevas: data.personas_nuevas,
                supervisores: data.supervisores,
                prevencionistas: data.prevencionistas,
                dotacion_total: data.dotacion_total,
                tipo_auditoria: data.tipo_auditoria || 'sistema', // Default to sistema
                estado_auditoria: data.estado_auditoria
            });
            if (data.actividades) {
                setActividades(data.actividades.map(ra => ({
                    id: ra.id,
                    actividad_id: ra.actividad_id,
                    codigo: ra.actividad?.codigo,
                    descripcion: ra.actividad?.descripcion,
                    requiere_evidencia: ra.actividad?.requiere_evidencia === 1 || ra.actividad?.requiere_evidencia === true,
                    cumple: ra.cumple,
                    responsable: ra.responsable || '',
                    descripcion_contratista: ra.descripcion_contratista || '',
                    evidencias: ra.evidencias || [],
                    // Audit Fields: 0=Fail, 1=Pass, 2=NA. Default to null or 0? 
                    // If backend sends null, maybe default to 0? Or keep null to show unchecked?
                    // Let's keep existing value.
                    cumple_auditor: ra.cumple_auditor,
                    observacion_auditor: ra.observacion_auditor || '',
                    hallazgos: ra.hallazgos || []
                })));
            }
        } catch (err) {
            setError('Error al cargar registro');
        }
    };

    const handleActividadChange = (index, field, value) => {
        const updated = [...actividades];
        updated[index][field] = value;
        setActividades(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // US-2.27: Validate Mandatory Evidence
        // Only valid if WE HAVE IDs (Edit Mode) or if backend handles it?
        // Backend handles "cerrado" validation, but frontend should block too.
        // If isEdit, verify.
        if (isEdit) {
            const missingEvidence = actividades.filter(a =>
                a.cumple &&
                a.requiere_evidencia &&
                (!a.evidencias || a.evidencias.length === 0)
            );

            if (missingEvidence.length > 0) {
                setError(`Faltan evidencias obligatorias para: ${missingEvidence.map(a => a.codigo).join(', ')}`);
                setLoading(false);
                window.scrollTo(0, 0);
                return;
            }
        }

        const payload = {
            ...form,
            periodo: `${form.periodo}-01`, // Convert YYYY-MM to YYYY-MM-DD
            actividades: actividades.map(a => ({
                id: a.id,
                actividad_id: a.actividad_id,
                cumple: a.cumple,
                responsable: a.responsable,
                descripcion_contratista: a.descripcion_contratista,
                cumple_auditor: a.cumple_auditor,
                observacion_auditor: a.observacion_auditor
            }))
        };

        try {
            if (isEdit) {
                await api.put(`/registros/${id}`, payload);
            } else {
                await api.post('/registros', payload);
            }
            navigate('/registros');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <button onClick={() => navigate(-1)} className="btn-back">
                    <ArrowLeft size={18} /> Volver
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1>{isEdit ? 'Editar Registro' : 'Nuevo Registro'}</h1>
                    {isEdit && (
                        <a
                            href={`${api.defaults.baseURL}/reportes/registro/${id}/pdf?token=${localStorage.getItem('token')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            <FileText size={18} />
                            Descargar Reporte
                            <FileText size={18} />
                            Descargar Reporte
                        </a>
                    )}

                    {/* US-5.1: Request Reopening */}

                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-card">
                    <h2>Información General</h2>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="periodo">Periodo *</label>
                            <input
                                id="periodo"
                                type="month"
                                value={form.periodo}
                                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="dotacion_total">Dotación Total</label>
                            <input
                                id="dotacion_total"
                                type="number"
                                value={form.dotacion_total}
                                onChange={(e) => setForm({ ...form, dotacion_total: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="personas_nuevas">Personas Nuevas</label>
                            <input
                                id="personas_nuevas"
                                type="number"
                                value={form.personas_nuevas}
                                onChange={(e) => setForm({ ...form, personas_nuevas: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="supervisores">Supervisores</label>
                            <input
                                id="supervisores"
                                type="number"
                                value={form.supervisores}
                                onChange={(e) => setForm({ ...form, supervisores: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="prevencionistas">Prevencionistas</label>
                            <input
                                id="prevencionistas"
                                type="number"
                                value={form.prevencionistas}
                                onChange={(e) => setForm({ ...form, prevencionistas: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                </div>

                {/* US-3.14: Audit Configuration Panel */}
                {(user?.role === 'admin' || user?.role === 'administrador_contrato') && (
                    <div className="form-card" style={{ borderLeft: '4px solid var(--color-brand-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <ClipboardCheck size={20} color="var(--color-brand-secondary)" />
                            <h2 style={{ margin: 0 }}>Panel de Auditoría</h2>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="tipo_auditoria">Tipo de Auditoría</label>
                                <select
                                    id="tipo_auditoria"
                                    value={form.tipo_auditoria || 'sistema'}
                                    onChange={(e) => setForm({ ...form, tipo_auditoria: e.target.value })}
                                >
                                    <option value="sistema">Sistema / Remota</option>
                                    <option value="terreno">Presencial / Terreno</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="estado_auditoria">Estado</label>
                                <select
                                    id="estado_auditoria"
                                    value={form.estado_auditoria}
                                    onChange={(e) => setForm({ ...form, estado_auditoria: e.target.value })}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="auditando">En Revisión (Auditando)</option>
                                    <option value="auditada_sistema">Aprobar (Sistema)</option>
                                    <option value="auditada_terreno">Aprobar (Terreno)</option>
                                    <option value="reabierto">Solicitar Corrección (Reapertura)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-card">
                    <h2>Actividades</h2>

                    <div className="actividades-form">
                        {actividades.map((act, index) => (
                            <div key={index} className="actividad-row">
                                <div className="actividad-info">
                                    <code>{act.codigo}</code>
                                    <span>{act.descripcion}</span>
                                </div>
                                <div className="actividad-fields">
                                    <label className="checkbox-field">
                                        <input
                                            type="checkbox"
                                            checked={act.cumple}
                                            onChange={(e) => handleActividadChange(index, 'cumple', e.target.checked)}
                                        />
                                        Cumple
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Responsable"
                                        value={act.responsable}
                                        onChange={(e) => handleActividadChange(index, 'responsable', e.target.value)}
                                        style={{ marginBottom: '0.5rem' }}
                                    />

                                    {/* US-2.25 & US-2.27: Evidence Upload */}
                                    {isEdit && act.id ? (
                                        <div className="evidence-section" style={{ marginTop: '0.5rem' }}>
                                            {act.requiere_evidencia && <small className="text-warning" style={{ display: 'block', marginBottom: 4 }}>* Evidencia Requerida</small>}
                                            <FileUpload
                                                registroActividadId={act.id}
                                                existingCount={act.evidencias?.length || 0}
                                                onUploadComplete={(evidencia) => {
                                                    const updated = [...actividades];
                                                    if (!updated[index].evidencias) updated[index].evidencias = [];
                                                    updated[index].evidencias.push(evidencia);
                                                    setActividades(updated);
                                                }}
                                            />
                                            {/* List uploaded files (Gallery) */}
                                            {act.evidencias && act.evidencias.length > 0 && (
                                                <div className="evidence-gallery" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    {act.evidencias.map(e => (
                                                        <a
                                                            key={e.id}
                                                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/evidencias/${e.id}/download?token=${localStorage.getItem('token')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="evidence-item"
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                                padding: '0.25rem 0.5rem',
                                                                background: '#f3f4f6',
                                                                borderRadius: '4px',
                                                                fontSize: '0.8rem',
                                                                textDecoration: 'none',
                                                                color: '#374151',
                                                                border: '1px solid #e5e7eb'
                                                            }}
                                                        >
                                                            {e.nombre_archivo.match(/\.(jpg|jpeg|png|gif)$/i) ? '🖼️' : '📄'}
                                                            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {e.nombre_archivo}
                                                            </span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                            Guarde el registro para subir evidencias.
                                        </div>
                                    )}

                                    {/* US-3.14: Audit Fields */}
                                    {(user?.role === 'admin' || user?.role === 'administrador_contrato') && (
                                        <div className="audit-section" style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #ccc' }}>
                                            <h4 style={{ fontSize: '0.8rem', color: 'var(--color-brand-secondary)', marginBottom: '0.5rem' }}>Zona Auditor</h4>
                                            <div className="audit-status-group" style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#10b981' }}>
                                                    <input
                                                        type="radio"
                                                        name={`audit_status_${index}`}
                                                        checked={act.cumple_auditor === 1}
                                                        onChange={() => handleActividadChange(index, 'cumple_auditor', 1)}
                                                    />
                                                    <span>Cumple</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#ef4444' }}>
                                                    <input
                                                        type="radio"
                                                        name={`audit_status_${index}`}
                                                        checked={act.cumple_auditor === 0}
                                                        onChange={() => handleActividadChange(index, 'cumple_auditor', 0)}
                                                    />
                                                    <span>No Cumple</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#6b7280' }}>
                                                    <input
                                                        type="radio"
                                                        name={`audit_status_${index}`}
                                                        checked={act.cumple_auditor === 2}
                                                        onChange={() => handleActividadChange(index, 'cumple_auditor', 2)}
                                                    />
                                                    <span>N/A</span>
                                                </label>
                                            </div>
                                            <textarea
                                                placeholder="Observación de auditoría..."
                                                value={act.observacion_auditor || ''}
                                                onChange={(e) => handleActividadChange(index, 'observacion_auditor', e.target.value)}
                                                style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.5rem' }}
                                                rows="2"
                                            />
                                            {/* US-3.8: Hallazgo UX */}
                                            {act.cumple_auditor === 0 && (
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    {act.hallazgos && act.hallazgos.length > 0 ? (
                                                        <HallazgoList
                                                            hallazgos={act.hallazgos}
                                                            onEdit={(h) => handleHallazgoEdit(h, act)}
                                                            onDelete={(hId) => handleHallazgoDelete(hId, act.id)}
                                                            onCompromiso={handleCompromisoClick}
                                                            canCreateCompromiso={canWrite('Compromiso') || canWrite('Registros')}
                                                            readOnly={!canWrite('Registro')}
                                                        />
                                                    ) : null}

                                                    <button
                                                        type="button"
                                                        className="btn-text"
                                                        style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, marginTop: '0.5rem' }}
                                                        onClick={() => openHallazgoModal(act)}
                                                    >
                                                        ➕ Agregar Hallazgo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Registro'}
                    </button>
                </div>
            </form>

            <HallazgoModal
                isOpen={hallazgoModal.show}
                onClose={() => setHallazgoModal({ show: false, actividad: null })}
                onSuccess={handleHallazgoSuccess}
                registroId={id}
                actividad={hallazgoModal.actividad}
                hallazgo={hallazgoModal.hallazgo}
            />

            <CompromisoModal
                isOpen={compromisoModal.show}
                onClose={() => setCompromisoModal({ show: false, hallazgo: null })}
                onSuccess={handleCompromisoSuccess}
                registroId={id}
                hallazgo={compromisoModal.hallazgo}
            />

            <SolicitudReaperturaModal
                registroId={id}
                isOpen={reaperturaModal.show}
                onClose={() => setReaperturaModal({ show: false })}
                onSuccess={() => {
                    alert('Solicitud enviada exitosamente');
                    fetchRegistro(); // Reload status
                }}
            />
        </div>
    );
}

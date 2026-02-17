// IEEE Trace: REQ-001 | US-001 | pages/programas/ElementoList.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, ArrowLeft, FolderOpen, Pencil, Paperclip } from 'lucide-react';
import './ElementoList.css';

export default function ElementoList() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const programId = searchParams.get('programa_id');

    const [program, setProgram] = useState(null);
    const [elementos, setElementos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec } = useAuth();

    // Modal states (reused from previous logic, simplified for brevity here)
    // In a real refactor, these should be separate components or keep existing modal logic.
    // implementing visual structure first.
    const [showActModal, setShowActModal] = useState(false);
    const [currentElementId, setCurrentElementId] = useState(null);
    const [newItem, setNewItem] = useState({
        nombre: '', numero: '', // For Element
        codigo: '', actividad: '', descripcion: '', criterios: '', frecuencia: 'mensual', requiere_evidencia: true // For Activity
    });

    const [isEditActivity, setIsEditActivity] = useState(false);
    const [currentActivityId, setCurrentActivityId] = useState(null);

    const openActModal = (elemId) => {
        setCurrentElementId(elemId);
        setIsEditActivity(false);
        setNewItem({ codigo: '', actividad: '', descripcion: '', criterios: '', frecuencia: 'mensual', requiere_evidencia: true, template: null });
        setShowActModal(true);
    };

    const openEditActModal = (act) => {
        setCurrentActivityId(act.id);
        setCurrentElementId(act.elemento_id);
        setIsEditActivity(true);
        setNewItem({
            codigo: act.codigo,
            actividad: act.actividad || act.nombre, // Handle potential field name diff
            descripcion: act.descripcion,
            criterios: act.criterios,
            frecuencia: act.frecuencia,
            requiere_evidencia: act.requiere_evidencia,

            template: null,
            template_url: act.template_url // Store existing URL for display
        });
        setShowActModal(true);
    };

    useEffect(() => {
        if (programId) {
            fetchProgramData();
        } else {
            setError("No se ha seleccionado un programa válido.");
            setLoading(false);
        }
    }, [programId]);

    const handleSaveActivity = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('codigo', newItem.codigo);
            formData.append('actividad', newItem.actividad);
            formData.append('descripcion', newItem.descripcion);
            formData.append('frecuencia', newItem.frecuencia);
            if (newItem.criterios) formData.append('criterios', newItem.criterios);
            formData.append('requiere_evidencia', newItem.requiere_evidencia ? 1 : 0);
            if (newItem.template) formData.append('template', newItem.template);

            if (isEditActivity) {
                await api.put(`/actividades/${currentActivityId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                formData.append('elemento_id', currentElementId);
                await api.post('/actividades', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setShowActModal(false);
            fetchProgramData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al guardar actividad');
        }
    };

    const fetchProgramData = async () => {
        setLoading(true);
        try {
            // Fetch Program Details
            const progRes = await api.get(`/programas/${programId}`);
            setProgram(progRes.data.data);

            // Fetch Elements for this program
            const elemRes = await api.get(`/elementos?programa_id=${programId}`);
            setElementos(elemRes.data.data);
        } catch (err) {
            setError('Error al cargar datos del programa.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Cargando...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!program) return <div className="error-message">Programa no encontrado</div>;

    // Calculate stats
    const totalActivities = elementos.reduce((acc, el) => acc + (el.actividades?.length || 0), 0);

    return (
        <div className="page-container-elements">
            {/* 1. Header Area */}
            <header className="elements-header">
                <div className="header-left">
                    <button onClick={() => navigate('/programas')} className="btn-back-circle" title="Volver a Programas">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="program-info-block">
                        <span className="program-badge">{program.codigo || `PROG-${program.id}`}</span>
                        <h1>
                            <span role="img" aria-label="doc">📄</span> {program.nombre}
                        </h1>
                    </div>
                </div>
                {canWrite('Programas') && (
                    <Link to={`/programas/${program.id}/edit`} className="btn-edit-program">
                        <Pencil size={16} /> Editar Programa
                    </Link>
                )}
            </header>

            {/* 2. Stats Dashboard */}
            <div className="stats-dashboard">
                <div className="stats-grid">
                    <div className="stat-box">
                        <span className="stat-value">{program.meta_cumplimiento || 85}%</span>
                        <span className="stat-label">Meta de Cumplimiento</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value green">{elementos.length}</span>
                        <span className="stat-label">Elementos</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value purple">{totalActivities}</span>
                        <span className="stat-label">Actividades Totales</span>
                    </div>
                </div>
                <p className="program-description-text">
                    {program.descripcion || 'Sin descripción.'}
                </p>
            </div>

            {/* 3. Elements Section Header */}
            <div className="elements-section-header">
                <div className="section-title">
                    <FolderOpen size={20} />
                    <span>Elementos y Actividades</span>
                </div>
                {canWrite('Programas') && (
                    <Link to={`/elementos/new?programa_id=${program.id}`} className="btn-new-element">
                        <Plus size={16} /> Nuevo Elemento
                    </Link>
                )}
            </div>

            {/* 4. Elements List */}
            <div>
                {elementos.length === 0 ? (
                    <div className="element-container" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                        No hay elementos definidos para este programa.
                    </div>
                ) : (
                    elementos.map((elem, index) => (
                        <div key={elem.id} className="element-container">
                            {/* Element Header */}
                            <div className="element-header-row">
                                <div className="element-info">
                                    <div className="element-number-circle">{elem.numero}</div>
                                    <div className="element-title-block">
                                        <h3>{elem.nombre}</h3>
                                        <p className="element-subtitle">{elem.actividades?.length || 0} actividades</p>
                                    </div>
                                </div>
                                <div className="element-actions">
                                    {canWrite('Programas') && (
                                        <>
                                            <button className="btn-add-activity" onClick={() => openActModal(elem.id)}>
                                                <Plus size={14} /> Actividad
                                            </button>
                                            <Link to={`/elementos/${elem.id}/edit`} className="btn-edit-text">
                                                <Pencil size={14} /> Editar
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Activities Table (if any) */}
                            {elem.actividades && elem.actividades.length > 0 && (
                                <div className="activities-table-wrapper">
                                    <table className="activities-table">
                                        <thead>
                                            <tr>
                                                <th className="code-col">Cód</th>
                                                <th className="activity-col">Actividad</th>
                                                <th className="desc-col">Descripción</th>
                                                <th className="criteria-col">Criterios</th>
                                                <th className="freq-col">Frec.</th>
                                                <th className="meta-col">Evid.</th>
                                                <th style={{ width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {elem.actividades.map(act => (
                                                <tr key={act.id}>
                                                    <td><span className="badge-code">{act.codigo}</span></td>
                                                    <td>{act.nombre || act.actividad || 'Actividad...'}</td>
                                                    <td>{act.descripcion}</td>
                                                    <td>{act.criterios || '-'}</td>
                                                    <td>{act.frecuencia}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {act.template_url ? (
                                                            <a
                                                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${act.template_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn-icon-only"
                                                                title="Descargar plantilla"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#2563eb',
                                                                    textDecoration: 'none'
                                                                }}
                                                            >
                                                                <Paperclip size={16} />
                                                            </a>
                                                        ) : (
                                                            (act.requiere_evidencia ? <span title="Requiere evidencia, sin plantilla" style={{ color: '#d1d5db' }}>-</span> : <span style={{ color: '#9ca3af' }}>-</span>)
                                                        )}
                                                    </td>
                                                    <td>
                                                        {canWrite('Programas') && (
                                                            <button
                                                                className="btn-icon-only"
                                                                onClick={() => openEditActModal(act)}
                                                                title="Editar actividad"
                                                            >
                                                                <Pencil size={14} className="text-gray-500 hover:text-blue-600" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            {/* Activity Modal */}
            {showActModal && (
                <div className="modal-overlay">
                    <div className="modal-panel max-w-xl p-6 bg-white rounded-lg shadow-xl">
                        <h2>{isEditActivity ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
                        <form onSubmit={handleSaveActivity}>
                            <div className="form-group">
                                <label>Código <span className="required">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.codigo}
                                    onChange={e => setNewItem({ ...newItem, codigo: e.target.value })}
                                    placeholder="e.g. 1.1"
                                />
                            </div>
                            <div className="form-group">
                                <label>Actividad (Nombre) <span className="required">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.actividad}
                                    onChange={e => setNewItem({ ...newItem, actividad: e.target.value })}
                                    placeholder="Nombre corto de la actividad"
                                />
                            </div>
                            <div className="form-group">
                                <label>Descripción <span className="required">*</span></label>
                                <textarea
                                    required
                                    value={newItem.descripcion}
                                    onChange={e => setNewItem({ ...newItem, descripcion: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Criterios de Aceptación</label>
                                <textarea
                                    value={newItem.criterios || ''}
                                    onChange={e => setNewItem({ ...newItem, criterios: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                                <div className="form-group half" style={{ flex: 1 }}>
                                    <label>Frecuencia <span className="required">*</span></label>
                                    <select
                                        value={newItem.frecuencia}
                                        onChange={e => setNewItem({ ...newItem, frecuencia: e.target.value })}
                                        className="select-input"
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    >
                                        <option value="mensual">Mensual</option>
                                        <option value="trimestral">Trimestral</option>
                                        <option value="semestral">Semestral</option>
                                        <option value="anual">Anual</option>
                                        <option value="cuando_aplique">Cuando aplique</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Plantilla de Evidencia (Opcional)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={e => setNewItem({ ...newItem, template: e.target.files[0] })}
                                />
                                {isEditActivity && !newItem.template && (
                                    <div style={{ marginTop: '5px' }}>
                                        <small className="text-gray-500" style={{ display: 'block' }}>
                                            Deja vacío para mantener la plantilla actual.
                                        </small>
                                        {newItem.template_url && (
                                            <a
                                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${newItem.template_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginTop: '4px',
                                                    color: '#2563eb',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                <Paperclip size={14} />
                                                Ver plantilla actual
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group checkbox-contain" style={{ marginTop: '10px' }}>
                                <label className="checkbox-label-modal" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={newItem.requiere_evidencia}
                                        onChange={e => setNewItem({ ...newItem, requiere_evidencia: e.target.checked })}
                                    />
                                    Requiere Evidencia
                                </label>
                            </div>

                            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowActModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    );
}

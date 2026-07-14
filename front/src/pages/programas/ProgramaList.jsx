// IEEE Trace: REQ-001 | US-001 | pages/programas/ProgramaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, FileText, List } from 'lucide-react';
import './ProgramaList.css';

export default function ProgramaList() {
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState({});
    const { user, canWrite, canExec } = useAuth();
    const isADC = user?.role === 'administrador_contrato';

    useEffect(() => {
        fetchProgramas();
    }, []);

    const fetchProgramas = async () => {
        try {
            const response = await api.get('/programas');
            setProgramas(response.data.data);
        } catch (err) {
            setError('Error al cargar programas');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este programa?')) return;
        try {
            await api.delete(`/programas/${id}`);
            fetchProgramas();
        } catch (err) {
            setError('Error al eliminar');
        }
    };

    // State for Element/Activity management
    const [showElemModal, setShowElemModal] = useState(false);
    const [showActModal, setShowActModal] = useState(false);
    const [isEditActivity, setIsEditActivity] = useState(false);
    const [currentProgramId, setCurrentProgramId] = useState(null);
    const [currentElementId, setCurrentElementId] = useState(null);
    const [currentActivityId, setCurrentActivityId] = useState(null);
    const [newItem, setNewItem] = useState({ nombre: '', numero: '', codigo: '', descripcion: '', frecuencia: '', criterio: '', template: null, actividad: '' });

    const openElemModal = (progId) => {
        setCurrentProgramId(progId);
        setNewItem({ nombre: '', numero: '' });
        setShowElemModal(true);
    };

    const openActModal = (elemId) => {
        setCurrentElementId(elemId);
        setIsEditActivity(false);
        setNewItem({ codigo: '', descripcion: '', frecuencia: '', template: null, actividad: '' });
        setShowActModal(true);
    };

    const openEditActModal = (act) => {
        setCurrentActivityId(act.id);
        setIsEditActivity(true);
        setNewItem({
            codigo: act.codigo,
            descripcion: act.descripcion,
            frecuencia: act.frecuencia,
            criterios: act.criterios,
            actividad: act.actividad,
            template: null,
            template_url: act.template_url
        });
        setShowActModal(true);
    };

    const handleCreateElement = async (e) => {
        e.preventDefault();
        try {
            await api.post('/elementos', { ...newItem, programa_id: currentProgramId });
            setShowElemModal(false);
            fetchProgramas();
        } catch (err) {
            alert('Error al crear elemento');
        }
    };

    const handleSaveActivity = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('codigo', newItem.codigo);
            formData.append('descripcion', newItem.descripcion);
            formData.append('frecuencia', newItem.frecuencia);
            if (newItem.criterios) formData.append('criterios', newItem.criterios);
            if (newItem.template) formData.append('plantilla', newItem.template);

            // Ensure actividad is sent
            formData.append('actividad', newItem.actividad || newItem.descripcion.substring(0, 50));

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
            fetchProgramas();
        } catch (err) {
            alert('Error al guardar actividad');
            console.error(err);
        }
    };

    const handleDeleteElement = async (id) => {
        if (!window.confirm('¿Eliminar elemento?')) return;
        try { await api.delete(`/elementos/${id}`); fetchProgramas(); } catch (e) { alert('Error'); }
    };

    const handleDeleteActivity = async (id) => {
        if (!window.confirm('¿Eliminar actividad?')) return;
        try { await api.delete(`/actividades/${id}`); fetchProgramas(); } catch (e) { alert('Error'); }
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1 className="page-title">
                    <span role="img" aria-label="programs">📋</span> Gestión de Programas
                </h1>
                {canWrite('Programas') && !isADC && (
                    <Link to="/programas/new" id="btn-new-program" className="btn-primary-add">
                        <Plus size={18} /> Nuevo Programa
                    </Link>
                )}
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="programs-grid">
                {programas.map((programa) => (
                    <div key={programa.id} id={`program-card-${programa.id}`} className="program-card">
                        {/* Header: Code/Badge and Percentage */}
                        <div className="card-header-row">
                            <span className="program-code-badge">
                                {programa.codigo || `PROG-${programa.id}`}
                            </span>
                            <div className="program-meta-container">
                                <span className="meta-label">Meta de Cumplimiento</span>
                                <span className="program-goal-large">
                                    {programa.meta_cumplimiento || '100'}%
                                </span>
                            </div>
                        </div>

                        {/* Content: Title and Description */}
                        <h3 className="program-name">{programa.nombre}</h3>
                        <p className="program-description">
                            {programa.descripcion || 'Sin descripción disponible para este programa.'}
                        </p>

                        {/* Stats Row */}
                        <div className="program-stats-row">
                            <div className="stat-item">
                                <FileText size={16} />
                                <span className="text-gray-600">{programa.elementos?.length || 0} elementos</span>
                            </div>
                            <div className="stat-item">
                                <List size={16} />
                                <span className="text-gray-600">0 registros</span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="card-actions">
                            <Link
                                to={`/elementos?programa_id=${programa.id}`}
                                className="btn-card-action btn-view btn-view-elements"
                                style={{ textDecoration: 'none' }}
                            >
                                Ver Elementos
                            </Link>

                            {canWrite('Programas') && !isADC && (
                                <Link to={`/programas/${programa.id}/edit`} className="btn-card-action btn-edit" style={{ textDecoration: 'none' }}>
                                    Editar
                                </Link>
                            )}

                            {canExec('Programas') && !isADC && (
                                <button
                                    className="btn-card-action btn-delete-icon"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(programa.id); }}
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        {/* Expanded Content (Details) */}
                        {expanded[programa.id] && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <h4 style={{ fontSize: '0.9rem' }}>Elementos</h4>
                                    {canWrite('Programas') && !isADC && (
                                        <button className="btn-link sm" onClick={() => openElemModal(programa.id)}>
                                            + Agregar
                                        </button>
                                    )}
                                </div>
                                {programa.elementos?.map((el) => (
                                    <div key={el.id} style={{ marginBottom: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{el.numero}. {el.nombre}</span>
                                            {canExec('Programas') && !isADC && <Trash2 size={12} className="text-danger cursor-pointer" onClick={() => handleDeleteElement(el.id)} />}
                                        </div>
                                        {/* Activities List under Element */}
                                        <div style={{ paddingLeft: '1rem', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <small style={{ color: '#666' }}>Actividades</small>
                                                {canWrite('Programas') && !isADC && (
                                                    <button className="btn-link sm" style={{ fontSize: '0.7em' }} onClick={() => openActModal(el.id)}>
                                                        + Actividad
                                                    </button>
                                                )}
                                            </div>
                                            {el.actividades?.map(act => (
                                                <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px', padding: '2px 0', borderBottom: '1px dashed #eee' }}>
                                                    <span title={act.descripcion}>{act.codigo} - {act.actividad || act.descripcion?.substring(0, 30)}</span>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        {act.template_url && !isADC && (
                                                            <a
                                                                href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${act.template_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="Descargar plantilla"
                                                                style={{ textDecoration: 'none', cursor: 'pointer', marginRight: '4px', fontSize: '1rem' }}
                                                            >
                                                                📎
                                                            </a>
                                                        )}
                                                        {canWrite('Programas') && !isADC && <Edit size={12} className="text-primary cursor-pointer" onClick={() => openEditActModal(act)} />}
                                                        {canExec('Programas') && !isADC && <Trash2 size={12} className="text-danger cursor-pointer" onClick={() => handleDeleteActivity(act.id)} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Element Modal */}
            {showElemModal && (
                <div className="modal-overlay">
                    <div className="form-card modal-content">
                        <h2>Nuevo Elemento</h2>
                        <form onSubmit={handleCreateElement}>
                            <div className="form-group">
                                <label>Número</label>
                                <input type="number" required value={newItem.numero} onChange={e => setNewItem({ ...newItem, numero: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input type="text" required value={newItem.nombre} onChange={e => setNewItem({ ...newItem, nombre: e.target.value })} />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowElemModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActModal && (
                <div className="modal-overlay">
                    <div className="form-card modal-content">
                        <h2>{isEditActivity ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
                        <form onSubmit={handleSaveActivity}>
                            <div className="form-group">
                                <label>Código</label>
                                <input type="text" required value={newItem.codigo} onChange={e => setNewItem({ ...newItem, codigo: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Actividad (Nombre Corto)</label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.actividad || ''}
                                    onChange={e => setNewItem({ ...newItem, actividad: e.target.value })}
                                    placeholder="Ej: Revisión Extintores"
                                />
                            </div>
                            <div className="form-group">
                                <label>Descripción Detallada</label>
                                <textarea required value={newItem.descripcion} onChange={e => setNewItem({ ...newItem, descripcion: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Criterios de Aceptación</label>
                                <textarea value={newItem.criterios || ''} onChange={e => setNewItem({ ...newItem, criterios: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Frecuencia</label>
                                <select
                                    value={newItem.frecuencia}
                                    onChange={e => setNewItem({ ...newItem, frecuencia: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="mensual">Mensual</option>
                                    <option value="trimestral">Trimestral</option>
                                    <option value="semestral">Semestral</option>
                                    <option value="anual">Anual</option>
                                    <option value="cuando_aplique">Cuando Aplique</option>
                                </select>
                            </div>
                            <div className="form-group">
                                 <label>Plantilla de Evidencia (Opcional)</label>
                                 <input
                                     type="file"
                                     accept=".pdf,.doc,.docx,.xls,.xlsx"
                                     onChange={e => setNewItem({ ...newItem, template: e.target.files[0] })}
                                 />
                                 {newItem.template_url && (
                                     <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                         <span>📎</span>
                                         <a
                                             href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${newItem.template_url}`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             style={{ color: '#003594', fontWeight: '600', textDecoration: 'underline' }}
                                         >
                                             Ver plantilla previa
                                         </a>
                                     </div>
                                 )}
                                 {newItem.template && (
                                     <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                         <span>📎</span>
                                         <a
                                             href={URL.createObjectURL(newItem.template)}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'underline' }}
                                         >
                                             Ver archivo cargado ({newItem.template.name})
                                         </a>
                                     </div>
                                 )}
                                 {isEditActivity && !newItem.template && (
                                     <small className="text-gray-500" style={{ display: 'block', marginTop: '5px' }}>
                                         Deja vacío para mantener la plantilla actual.
                                     </small>
                                 )}
                             </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowActModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// IEEE Trace: REQ-001 | US-001 | pages/programas/ProgramaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export default function ProgramaList() {
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState({});
    const { canWrite, canExec } = useAuth();

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
    const [currentProgramId, setCurrentProgramId] = useState(null);
    const [currentElementId, setCurrentElementId] = useState(null);
    const [newItem, setNewItem] = useState({ nombre: '', numero: '', codigo: '', descripcion: '', frecuencia: '' });

    const openElemModal = (progId) => {
        setCurrentProgramId(progId);
        setNewItem({ nombre: '', numero: '' });
        setShowElemModal(true);
    };

    const openActModal = (elemId) => {
        setCurrentElementId(elemId);
        setNewItem({ codigo: '', descripcion: '', frecuencia: '' });
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

    const handleCreateActivity = async (e) => {
        e.preventDefault();
        try {
            await api.post('/actividades', { ...newItem, elemento_id: currentElementId });
            setShowActModal(false);
            fetchProgramas();
        } catch (err) {
            alert('Error al crear actividad');
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
                <h1>Programas</h1>
                {canWrite('Programas') && (
                    <Link to="/programas/new" className="btn-primary">
                        <Plus size={18} /> Nuevo Programa
                    </Link>
                )}
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="programa-list">
                {programas.map((programa) => (
                    <div key={programa.id} className="programa-card">
                        <div className="programa-header" onClick={() => toggleExpand(programa.id)}>
                            <div className="programa-title">
                                {expanded[programa.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                <h3>{programa.nombre}</h3>
                                <span className={`badge ${programa.activo ? 'active' : 'inactive'}`}>
                                    {programa.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div className="programa-actions">
                                {canWrite('Programas') && (
                                    <Link to={`/programas/${programa.id}/edit`} className="btn-icon" onClick={e => e.stopPropagation()}>
                                        <Edit size={18} />
                                    </Link>
                                )}
                                {canExec('Programas') && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(programa.id); }} className="btn-icon danger">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {expanded[programa.id] && (
                            <div className="programa-content">
                                <p>{programa.descripcion || 'Sin descripción'}</p>

                                {/* Elements Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <h4>Elementos</h4>
                                    {canWrite('Programas') && (
                                        <button className="btn-secondary sm" onClick={() => openElemModal(programa.id)}>
                                            <Plus size={14} /> Agregar Elemento
                                        </button>
                                    )}
                                </div>

                                {programa.elementos?.map((elemento) => (
                                    <div key={elemento.id} className="elemento-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <h4>{elemento.numero}. {elemento.nombre}</h4>
                                            {canExec('Programas') && (
                                                <button onClick={() => handleDeleteElement(elemento.id)} className="text-danger">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <ul className="actividad-list">
                                            {elemento.actividades?.map((act) => (
                                                <li key={act.id}>
                                                    <div>
                                                        <code>{act.codigo}</code> - {act.descripcion}
                                                        <span className="frecuencia">{act.frecuencia}</span>
                                                    </div>
                                                    {canExec('Programas') && (
                                                        <button onClick={() => handleDeleteActivity(act.id)} className="text-danger icon-btn">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                        {canWrite('Programas') && (
                                            <div style={{ marginTop: 5 }}>
                                                <button className="btn-link sm" onClick={() => openActModal(elemento.id)}>
                                                    + Agregar Actividad
                                                </button>
                                            </div>
                                        )}
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
                        <h2>Nueva Actividad</h2>
                        <form onSubmit={handleCreateActivity}>
                            <div className="form-group">
                                <label>Código</label>
                                <input type="text" required value={newItem.codigo} onChange={e => setNewItem({ ...newItem, codigo: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea required value={newItem.descripcion} onChange={e => setNewItem({ ...newItem, descripcion: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Frecuencia</label>
                                <input type="text" value={newItem.frecuencia} onChange={e => setNewItem({ ...newItem, frecuencia: e.target.value })} />
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

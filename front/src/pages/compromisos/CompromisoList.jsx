// IEEE Trace: REQ-010 | US-010 | pages/compromisos/CompromisoList.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { CheckCircle, Clock, AlertCircle, Calendar, User, Edit, X, Save } from 'lucide-react';

export default function CompromisoList() {
    const [searchParams] = useSearchParams();
    const [compromisos, setCompromisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const hallazgoId = searchParams.get('hallazgo');
    const { user } = useAuth();

    // Edit Modal State
    const [editingCompromiso, setEditingCompromiso] = useState(null);
    const [editForm, setEditForm] = useState({
        descripcion: '',
        fecha_compromiso: '',
        responsable_id: ''
    });

    useEffect(() => {
        fetchCompromisos();
    }, [filter]);

    const fetchCompromisos = async () => {
        try {
            let params = {};
            if (filter === 'vencidos') params.vencidos = 'true';
            else if (filter !== 'all') params.estado = filter;
            if (hallazgoId) params.hallazgo_id = hallazgoId;

            const response = await api.get('/compromisos', { params });
            setCompromisos(response.data.data);
        } catch (err) {
            setError('Error al cargar compromisos');
        } finally {
            setLoading(false);
        }
    };

    const handleCumplir = async (id) => {
        const observacion = prompt('Observación de cumplimiento (opcional):');
        try {
            await api.patch(`/compromisos/${id}/cumplir`, { observacion_cumplimiento: observacion });
            fetchCompromisos();
        } catch (err) {
            setError('Error al marcar como cumplido');
        }
    };

    const handleEditClick = (comp) => {
        setEditingCompromiso(comp);
        setEditForm({
            descripcion: comp.descripcion,
            fecha_compromiso: comp.fecha_compromiso.split('T')[0],
            responsable_id: comp.responsable_id
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/compromisos/${editingCompromiso.id}`, editForm);
            setEditingCompromiso(null);
            fetchCompromisos();
        } catch (err) {
            alert('Error al actualizar compromiso');
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'cumplido': return <CheckCircle className="text-success" size={20} />;
            case 'vencido': return <AlertCircle className="text-danger" size={20} />;
            case 'en_proceso': return <Clock className="text-info" size={20} />;
            default: return <Clock className="text-warning" size={20} />;
        }
    };

    const isVencido = (fecha, estado) => {
        if (['cumplido'].includes(estado)) return false;
        return new Date(fecha) < new Date();
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Compromisos</h1>
                <div className="filter-tabs">
                    {['all', 'pendiente', 'en_proceso', 'cumplido', 'vencidos'].map((f) => (
                        <button
                            key={f}
                            className={`filter-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="compromisos-grid">
                {compromisos.length === 0 ? (
                    <div className="empty-state">No hay compromisos</div>
                ) : (
                    compromisos.map((c) => (
                        <div
                            key={c.id}
                            className={`compromiso-card ${isVencido(c.fecha_compromiso, c.estado) ? 'vencido' : ''}`}
                        >
                            <div className="compromiso-header" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {getEstadoIcon(c.estado)}
                                    <span className={`badge ${c.estado}`}>{c.estado}</span>
                                </div>

                                {['pendiente', 'en_proceso'].includes(c.estado) &&
                                    (user.role === 'admin' || user.id === c.creado_por_id) && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEditClick(c)}
                                            title="Editar Compromiso"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                            </div>

                            <p className="compromiso-descripcion">{c.descripcion}</p>

                            <div className="compromiso-meta">
                                <div className="meta-item">
                                    <Calendar size={14} />
                                    <span>
                                        {new Date(c.fecha_compromiso).toLocaleDateString('es-CL')}
                                        {isVencido(c.fecha_compromiso, c.estado) && (
                                            <span className="vencido-tag">VENCIDO</span>
                                        )}
                                    </span>
                                </div>
                                <div className="meta-item">
                                    <User size={14} />
                                    <span>{c.responsable?.name || 'Sin asignar'}</span>
                                </div>
                            </div>

                            {c.registro && (
                                <div className="compromiso-origen">
                                    Registro: {c.registro.periodo} - {c.registro.eecc_nombre}
                                </div>
                            )}

                            {['pendiente', 'en_proceso'].includes(c.estado) &&
                                (user.id === c.responsable_id || user.role === 'admin') && (
                                    <button
                                        className="btn-cumplir"
                                        onClick={() => handleCumplir(c.id)}
                                    >
                                        <CheckCircle size={16} /> Marcar Cumplido
                                    </button>
                                )}
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            {editingCompromiso && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="form-card" style={{ width: '500px', maxWidth: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2>Editar Compromiso</h2>
                            <button className="btn-icon" onClick={() => setEditingCompromiso(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    value={editForm.descripcion}
                                    onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha Compromiso</label>
                                <input
                                    type="date"
                                    value={editForm.fecha_compromiso}
                                    onChange={e => setEditForm({ ...editForm, fecha_compromiso: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setEditingCompromiso(null)}>Cancelar</button>
                                <button type="submit" className="btn-primary">
                                    <Save size={16} /> Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

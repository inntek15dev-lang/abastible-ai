// IEEE Trace: REQ-011 | US-011 | pages/licitaciones/LicitacionList.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Briefcase, Calendar, CheckCircle, FileText, Plus, User, Upload, Download, Paperclip } from 'lucide-react';

export default function LicitacionList() {
    const [licitaciones, setLicitaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, isAdmin, canWrite, canExec } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [newLic, setNewLic] = useState({ titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', presupuesto_referencial: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [postulacionFile, setPostulacionFile] = useState(null);

    useEffect(() => {
        fetchLicitaciones();
    }, []);

    const fetchLicitaciones = async () => {
        try {
            const response = await api.get('/licitaciones');
            setLicitaciones(response.data.data);
        } catch (err) {
            setError('Error al cargar licitaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // 1. Create Licitacion
            const res = await api.post('/licitaciones', newLic);
            const licId = res.data.data.id;

            // 2. Upload Document if exists
            if (uploadFile) {
                const formData = new FormData();
                formData.append('file', uploadFile);
                formData.append('entidad_tipo', 'Licitacion');
                formData.append('entidad_id', licId);
                formData.append('label', 'Bases de Licitación');
                await api.post('/documentos/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setShowModal(false);
            fetchLicitaciones();
            setNewLic({ titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', presupuesto_referencial: '' });
            setUploadFile(null);
        } catch (err) {
            alert('Error al crear licitación');
        }
    };

    const handlePostular = async (id) => {
        const oferta = prompt('Ingrese su oferta económica (CLP):');
        if (!oferta) return;

        // Note: For now we use prompt for money but ask for file via a proper modal would be better.
        // But to keep it simple as per previous pattern:
        // We can't easily ask for file via prompt.
        // Let's implement a small state validation or force the user to use a "Postular" modal.
        // For MVP Speed: Just alert that they need to enable file upload or just submit without file for now?
        // NO, the requirement says "Oferta Técnica".
        // Let's create a dedicated local state for "Postular Modal".
        // OR better: Just render the file input in the list row? No, that's ugly.
        // Let's use a quick "PostularModal" state.

        // REFACTOR: Instead of simple prompt, we switch to a Postular Modal.
        setSelectedLicitacionId(id);
        setShowPostularModal(true);
    };

    const submitPostulacion = async (e) => {
        e.preventDefault();
        try {
            let docId = null;
            if (postulacionFile) {
                const formData = new FormData();
                formData.append('file', postulacionFile);
                formData.append('entidad_tipo', 'Postulacion'); // We link it after creation or treat as orphan first?
                // Actually Postulacion doesn't exist yet. 
                // We can upload as generic, get ID, then send ID to postular endpoint.
                formData.append('label', 'Oferta Técnica');

                const uploadRes = await api.post('/documentos/upload', formData);
                docId = uploadRes.data.data.id;
            }

            await api.post(`/licitaciones/${selectedLicitacionId}/postular`, {
                oferta_economica: postularData.oferta,
                oferta_tecnica: 'Adjunto Oferta Técnica',
                documento_id: docId
            });

            alert('Postulación enviada exitosamente');
            setShowPostularModal(false);
            setPostularData({ oferta: '' });
            setPostulacionFile(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Error al postular');
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            borrador: 'secondary',
            abierta: 'success',
            cerrada: 'warning',
            adjudicada: 'info'
        };
        return <span className={`badge ${colors[status] || 'secondary'}`}>{status}</span>;
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>
                    <Briefcase size={24} style={{ marginRight: 10 }} />
                    Licitaciones Disponibles
                </h1>
                {canWrite('Licitaciones_Crear') && (
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Nueva Licitación
                    </button>
                )}
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="compromisos-grid">
                {licitaciones.map((lic) => (
                    <div key={lic.id} className="compromiso-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <div className="compromiso-header" style={{ justifyContent: 'space-between' }}>
                            <h3>{lic.titulo}</h3>
                            {getStatusBadge(lic.estado)}
                        </div>

                        <p className="compromiso-descripcion">{lic.descripcion}</p>

                        <div className="compromiso-meta">
                            <div className="meta-item">
                                <Calendar size={14} />
                                Inicio: {new Date(lic.fecha_inicio).toLocaleDateString()}
                            </div>
                            <div className="meta-item">
                                <Calendar size={14} />
                                Fin: {new Date(lic.fecha_fin).toLocaleDateString()}
                            </div>
                            {lic.presupuesto_referencial && (
                                <div className="meta-item">
                                    <strong>$$$:</strong> {lic.presupuesto_referencial}
                                </div>
                            )}

                            {/* Bases Download */}
                            {lic.documentos && lic.documentos.length > 0 && (
                                <div className="meta-item" style={{ width: '100%', marginTop: 5 }}>
                                    <FileText size={14} />
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            window.open(`http://localhost:3000/api/documentos/${lic.documentos[0].id}/download?token=${localStorage.getItem('token')}`, '_blank');
                                        }}
                                        className="text-blue-600 underline"
                                    >
                                        Descargar Bases
                                    </a>
                                </div>
                            )}
                        </div>


                        <div className="compromiso-origen">
                            Creado por: {lic.creador?.name}
                        </div>

                        {/* Contractor Action */}
                        {canExec('Licitaciones_Postular') && lic.estado === 'abierta' && (
                            <button
                                className="btn-primary"
                                style={{ marginTop: 12, width: '100%' }}
                                onClick={() => handlePostular(lic.id)}
                            >
                                Postular
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Simple Modal */}
            {
                showModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div className="form-card" style={{ width: '500px', maxWidth: '90%' }}>
                            <h2>Nueva Licitación</h2>
                            <form onSubmit={handleCreate} className="form-group">
                                <input
                                    type="text" placeholder="Título" required
                                    value={newLic.titulo} onChange={e => setNewLic({ ...newLic, titulo: e.target.value })}
                                />
                                <textarea
                                    placeholder="Descripción" required rows={3}
                                    value={newLic.descripcion} onChange={e => setNewLic({ ...newLic, descripcion: e.target.value })}
                                />
                                <div className="form-row">
                                    <div>
                                        <label>Inicio</label>
                                        <input type="date" required value={newLic.fecha_inicio} onChange={e => setNewLic({ ...newLic, fecha_inicio: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Fin</label>
                                        <input type="date" required value={newLic.fecha_fin} onChange={e => setNewLic({ ...newLic, fecha_fin: e.target.value })} />
                                    </div>
                                </div>
                                <input
                                    type="number" placeholder="Presupuesto Referencial"
                                    value={newLic.presupuesto_referencial} onChange={e => setNewLic({ ...newLic, presupuesto_referencial: e.target.value })}
                                />

                                <div style={{ marginTop: 10 }}>
                                    <label style={{ display: 'block', marginBottom: 5 }}>Bases (PDF)</label>
                                    <input type="file" accept=".pdf" onChange={e => setUploadFile(e.target.files[0])} />
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary">Crear</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Postular Modal */}
            {
                showPostularModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div className="form-card" style={{ width: '400px', maxWidth: '90%' }}>
                            <h2>Postular a Licitación</h2>
                            <form onSubmit={submitPostulacion} className="form-group">
                                <label>Oferta Económica (CLP)</label>
                                <input
                                    type="number" placeholder="Ej: 1500000" required
                                    value={postularData.oferta} onChange={e => setPostularData({ ...postularData, oferta: e.target.value })}
                                />

                                <label>Oferta Técnica (PDF)</label>
                                <input type="file" accept=".pdf" required onChange={e => setPostulacionFile(e.target.files[0])} />

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowPostularModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary">Enviar Postulación</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

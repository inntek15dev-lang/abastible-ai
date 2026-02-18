import { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../api';

export default function CompromisosModal({ registroId, onClose }) {
    const [compromisos, setCompromisos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (registroId) {
            fetchCompromisos();
        }
    }, [registroId]);

    const fetchCompromisos = async () => {
        try {
            const response = await api.get('/compromisos', { params: { registro_id: registroId } });
            setCompromisos(response.data.data);
        } catch (error) {
            console.error("Error fetching compromisos:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 50
        }}>
            <div style={{
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '500px',
                padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Compromisos del Registro</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
                    ) : compromisos.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                            No hay compromisos registrados.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {compromisos.map(comp => (
                                <div key={comp.id} style={{
                                    border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px',
                                    background: '#f9fafb'
                                }}>
                                    <div style={{ fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                                        {comp.descripcion}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#6b7280' }}>
                                        <Calendar size={14} />
                                        <span>Fecha: {new Date(comp.fecha_compromiso).toLocaleDateString('es-CL')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', background: '#3b82f6', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

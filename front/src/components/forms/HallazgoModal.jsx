import { useState } from 'react';
import { Save, X } from 'lucide-react';
import api from '../../api';

export default function HallazgoModal({ isOpen, onClose, onSuccess, registroId, actividad, hallazgo }) {
    const isEdit = Boolean(hallazgo);
    const [tipo, setTipo] = useState('no_conformidad');
    const [descripcion, setDescripcion] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill form on open
    const [initialized, setInitialized] = useState(false);
    if (isOpen && !initialized) {
        if (isEdit) {
            setTipo(hallazgo.tipo);
            setDescripcion(hallazgo.descripcion);
            setFechaLimite(hallazgo.fecha_limite ? hallazgo.fecha_limite.slice(0, 10) : '');
        } else {
            setTipo('no_conformidad');
            setDescripcion('');
            setFechaLimite('');
        }
        setInitialized(true);
    }

    // Reset when closed
    if (!isOpen && initialized) {
        setInitialized(false);
    }

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                registro_id: registroId,
                registro_actividad_id: actividad?.id,
                tipo,
                descripcion,
                fecha_limite: fechaLimite || null
            };

            let response;
            if (isEdit) {
                // Keep existing status unless changed via specific logic (not here)
                response = await api.put(`/hallazgos/${hallazgo.id}`, payload);
            } else {
                response = await api.post('/hallazgos', payload);
            }

            if (response.data.success) {
                onSuccess(response.data.data);
                onClose();
            }
        } catch (err) {
            console.error(err);
            setError('Error al guardar hallazgo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', width: '90%', maxWidth: '500px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>{isEdit ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    Actividad: <strong>{actividad?.codigo}</strong> - {actividad?.descripcion}
                </div>

                {error && <div className="text-danger" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tipo</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="no_conformidad">No Conformidad</option>
                            <option value="observacion">Observación</option>
                            <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Descripción</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows="3"
                            required
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Fecha Límite (Opcional)</label>
                        <input
                            type="date"
                            value={fechaLimite}
                            onChange={(e) => setFechaLimite(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Hallazgo')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

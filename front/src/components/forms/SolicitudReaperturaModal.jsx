import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import api from '../../api';

const SolicitudReaperturaModal = ({ registroId, onClose, onSuccess }) => {
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/reaperturas', {
                registro_id: registroId,
                motivo
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al enviar solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Solicitar Reapertura</h2>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Motivo de la solicitud</label>
                        <textarea
                            id="reapertura-motivo"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Explique por qué necesita reabrir este registro..."
                            required
                            rows={4}
                        />
                        <small className="help-text">La solicitud será revisada por un administrador.</small>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                            Cancelar
                        </button>
                        <button id="btn-enviar-reapertura" type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Enviando...' : (
                                <>
                                    <Send size={16} /> Enviar Solicitud
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SolicitudReaperturaModal;

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../../api';
import Modal from '../ui/Modal';

const SolicitudReaperturaModal = ({ isOpen = true, registroId, onClose, onSuccess, isDirect = false }) => {
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isDirect ? '/reaperturas/directa' : '/reaperturas';
            await api.post(endpoint, {
                registro_id: registroId,
                motivo
            });
            onSuccess();
            // onClose is handled by parent upon success usually, but here we can double check
            if (onClose) onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al enviar solicitud');
        } finally {
            setLoading(false);
        }
    };

    const footerButtons = (
        <>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancelar
            </button>
            <button
                id="btn-enviar-reapertura"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={loading}
            >
                {loading ? 'Enviando...' : (
                    <>
                        <Send size={16} /> Enviar Solicitud
                    </>
                )}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isDirect ? "Reabrir Registro" : "Solicitar Reapertura"}
            footer={footerButtons}
        >
            <form onSubmit={handleSubmit} id="form-reapertura">
                <div className="form-group">
                    <label htmlFor="reapertura-motivo">{isDirect ? "Comentario de Reapertura" : "Motivo de la solicitud"}</label>
                    <textarea
                        id="reapertura-motivo"
                        className="form-control"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder={isDirect ? "Ingrese el motivo de la reapertura directa..." : "Explique por qué necesita reabrir este registro..."}
                        required
                        rows={4}
                    />
                    {!isDirect && (
                        <small className="help-text text-gray-500 mt-1 block">
                            La solicitud será revisada por un administrador.
                        </small>
                    )}
                </div>

                {error && (
                    <div className="error-message text-red-600 bg-red-50 p-3 rounded-md mt-2 text-sm">
                        {error}
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default SolicitudReaperturaModal;

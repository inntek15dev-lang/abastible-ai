import { useState } from 'react';
import { Save } from 'lucide-react';
import api from '../../api';
import Modal from '../ui/Modal';

export default function CompromisoModal({ isOpen, onClose, onSuccess, registroId, hallazgo }) {
    const [descripcion, setDescripcion] = useState('');
    const [fechaCompromiso, setFechaCompromiso] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill or reset logic if needed, but for "New" usually empty.
    // If re-opening, valid to reset errors.
    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                registro_id: registroId,
                hallazgo_id: hallazgo?.id,
                descripcion,
                fecha_compromiso: fechaCompromiso
            };

            const response = await api.post('/compromisos', payload);
            if (response.data.success) {
                onSuccess(response.data.data);
                onClose();
            }
        } catch (err) {
            console.error(err);
            setError('Error al guardar compromiso');
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
                type="submit"
                className="btn-primary"
                disabled={loading}
                onClick={handleSubmit}
            >
                {loading ? 'Guardando...' : (
                    <>
                        <Save size={16} /> Crear Compromiso
                    </>
                )}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nuevo Compromiso"
            footer={footerButtons}
        >
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
                Hallazgo: <strong>{hallazgo?.descripcion}</strong>
            </div>

            {error && <div className="error-message mb-4">{error}</div>}

            <form onSubmit={handleSubmit} id="form-compromiso">
                <div className="form-group">
                    <label htmlFor="comp-descripcion">Descripción del Compromiso</label>
                    <textarea
                        id="comp-descripcion"
                        className="form-control"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows="3"
                        required
                        placeholder="Detalle la acción correctiva a implementar..."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="comp-fecha">Fecha de Cumplimiento</label>
                    <input
                        id="comp-fecha"
                        type="date"
                        className="form-control"
                        value={fechaCompromiso}
                        onChange={(e) => setFechaCompromiso(e.target.value)}
                        required
                    />
                </div>
            </form>
        </Modal>
    );
}

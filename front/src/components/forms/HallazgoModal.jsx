import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../../api';
import Modal from '../ui/Modal';

export default function HallazgoModal({ isOpen, onClose, onSuccess, registroId, actividad, hallazgo }) {
    const isEdit = Boolean(hallazgo);
    const [tipo, setTipo] = useState('no_conformidad');
    const [descripcion, setDescripcion] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (isEdit) {
                setTipo(hallazgo.tipo);
                setDescripcion(hallazgo.descripcion);
                setFechaLimite(hallazgo.fecha_limite ? hallazgo.fecha_limite.slice(0, 10) : '');
            } else {
                setTipo('no_conformidad');
                setDescripcion('');
                setFechaLimite('');
            }
            setError('');
        }
    }, [isOpen, isEdit, hallazgo]);

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

    const footerButtons = (
        <>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading} onClick={handleSubmit}>
                {loading ? 'Guardando...' : (
                    <>
                        <Save size={16} /> {isEdit ? 'Actualizar' : 'Crear Hallazgo'}
                    </>
                )}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}
            footer={footerButtons}
        >
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
                Actividad: <strong>{actividad?.codigo}</strong> - {actividad?.descripcion}
            </div>

            {error && <div className="error-message mb-4">{error}</div>}

            <form onSubmit={handleSubmit} id="form-hallazgo">
                <div className="form-group">
                    <label htmlFor="hallazgo-tipo">Tipo</label>
                    <select
                        id="hallazgo-tipo"
                        className="form-control"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        <option value="no_conformidad">No Conformidad</option>
                        <option value="observacion">Observación</option>
                        <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="hallazgo-descripcion">Descripción</label>
                    <textarea
                        id="hallazgo-descripcion"
                        className="form-control"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows="3"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="hallazgo-fecha">Fecha Límite (Opcional)</label>
                    <input
                        id="hallazgo-fecha"
                        type="date"
                        className="form-control"
                        value={fechaLimite}
                        onChange={(e) => setFechaLimite(e.target.value)}
                    />
                </div>
            </form>
        </Modal>
    );
}

import { useState } from 'react';
import { Save, Calendar, FileText, Shield } from 'lucide-react';
import api from '../../api';
import Modal from '../ui/Modal';

export default function CompromisoModal({ isOpen, onClose, onSuccess, registroId, hallazgo }) {
    const [descripcion, setDescripcion] = useState('');
    const [fechaCompromiso, setFechaCompromiso] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            <button
                type="button"
                onClick={onClose}
                className="btn-link"
                disabled={loading}
                style={{
                    color: '#64748b',
                    fontWeight: 500,
                    textDecoration: 'none',
                    marginRight: 'auto'
                }}
            >
                Cancelar
            </button>
            <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                onClick={handleSubmit}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    backgroundColor: '#1d4ed8' // Blue for commitments
                }}
            >
                {loading ? 'Guardando...' : (
                    <>
                        <Save size={18} /> Crear Compromiso
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
            maxWidth="max-w-lg"
        >
            {/* Context Header */}
            <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
            }}>
                <div style={{
                    minWidth: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Shield size={20} />
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Vinculado al Hallazgo
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500, lineHeight: '1.4' }}>
                        "{hallazgo?.descripcion || 'Sin descripción'}"
                    </div>
                </div>
            </div>

            {error && <div className="error-message mb-4" style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                border: '1px solid #fca5a5'
            }}>{error}</div>}

            <form onSubmit={handleSubmit} id="form-compromiso">
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="comp-descripcion" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} /> Descripción del Compromiso
                    </label>
                    <textarea
                        id="comp-descripcion"
                        className="form-control"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows="4"
                        required
                        placeholder="Detalle la acción correctiva a implementar para resolver el hallazgo..."
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem',
                            resize: 'vertical',
                            minHeight: '100px'
                        }}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="comp-fecha" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} /> Fecha de Cumplimiento
                    </label>
                    <input
                        id="comp-fecha"
                        type="date"
                        className="form-control"
                        value={fechaCompromiso}
                        onChange={(e) => setFechaCompromiso(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
            </form>
        </Modal>
    );
}

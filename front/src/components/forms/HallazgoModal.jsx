import { useState, useEffect } from 'react';
import { Save, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
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

    // Helper for visual badges based on type
    const getTypeConfig = (t) => {
        switch (t) {
            case 'no_conformidad':
                return { label: 'No Conformidad', color: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle };
            case 'observacion':
                return { label: 'Observación', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Info };
            case 'oportunidad_mejora':
                return { label: 'Oportunidad de Mejora', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CheckCircle };
            default:
                return { label: 'Hallazgo', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: Info };
        }
    };

    const currentTypeConfig = getTypeConfig(tipo);
    const CurrentIcon = currentTypeConfig.icon;

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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                {loading ? 'Guardando...' : (
                    <>
                        <Save size={18} /> {isEdit ? 'Actualizar Hallazgo' : 'Registrar Hallazgo'}
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
                gap: '12px'
            }}>
                <div style={{
                    minWidth: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                }}>
                    {actividad?.codigo?.split('.')[0] || 'A'}
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Actividad {actividad?.codigo}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500, lineHeight: '1.4' }}>
                        {actividad?.descripcion}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message mb-4" style={{
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '20px',
                    border: '1px solid #fca5a5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} id="form-hallazgo">
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="hallazgo-tipo" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        Tipo de Hallazgo
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            id="hallazgo-tipo"
                            className="form-control"
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                paddingLeft: '40px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.95rem',
                                backgroundColor: '#fff',
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="no_conformidad">No Conformidad</option>
                            <option value="observacion">Observación</option>
                            <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                        </select>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: currentTypeConfig.color.includes('red') ? '#dc2626' : currentTypeConfig.color.includes('amber') ? '#d97706' : '#003594'
                        }}>
                            <CurrentIcon size={18} />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                        Seleccione el impacto del hallazgo detectado.
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label htmlFor="hallazgo-descripcion" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        Descripción Detallada
                    </label>
                    <textarea
                        id="hallazgo-descripcion"
                        className="form-control"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows="4"
                        required
                        placeholder="Describa el hallazgo con claridad y precisión..."
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
                    <label htmlFor="hallazgo-fecha" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} /> Fecha Límite (Opcional)
                    </label>
                    <input
                        id="hallazgo-fecha"
                        type="date"
                        className="form-control"
                        value={fechaLimite}
                        onChange={(e) => setFechaLimite(e.target.value)}
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

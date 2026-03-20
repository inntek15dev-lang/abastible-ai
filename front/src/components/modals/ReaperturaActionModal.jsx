import React, { useState } from 'react';
import { Check, X, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';

/**
 * ReaperturaActionModal
 * Modal para que el Admin/ADC apruebe o rechace solicitudes de reapertura.
 * Requiere fecha límite para aprobación y motivo para rechazo.
 */
export default function ReaperturaActionModal({ isOpen, onClose, onConfirm, solicitud, actionType }) {
    const isAprobar = actionType === 'aprobar';
    const [respuesta, setRespuesta] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !solicitud) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validations
        if (!isAprobar && !respuesta.trim()) {
            setError('Debe proporcionar un motivo para el rechazo.');
            return;
        }
        if (isAprobar && !fechaLimite) {
            setError('Debe definir una fecha límite para la subsanación.');
            return;
        }

        setLoading(true);
        try {
            await onConfirm(solicitud.id, actionType, {
                respuesta: respuesta || (isAprobar ? 'Solicitud Aprobada' : ''),
                fecha_limite: fechaLimite
            });
            setRespuesta('');
            setFechaLimite('');
            onClose();
        } catch (err) {
            setError(err.message || 'Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const footer = (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <button 
                type="button" 
                onClick={onClose} 
                className="btn-secondary"
                disabled={loading}
                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 500 }}
            >
                Cancelar
            </button>
            <button 
                type="button" 
                onClick={handleSubmit} 
                className={isAprobar ? 'btn-primary' : 'btn-danger'}
                disabled={loading}
                style={{ 
                    padding: '8px 24px', 
                    borderRadius: '8px', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: isAprobar ? '#10b981' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'Procesando...' : (
                    <>
                        {isAprobar ? <Check size={18} /> : <X size={18} />}
                        {isAprobar ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                    </>
                )}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isAprobar ? 'Aprobar Solicitud de Reapertura' : 'Rechazar Solicitud de Reapertura'}
            footer={footer}
            maxWidth="max-w-md"
        >
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                        Registro: {solicitud.registro?.periodo}
                    </div>
                    <div style={{ color: '#64748b' }}>
                        Solicitante: {solicitud.solicitante?.name}
                    </div>
                    <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#475569' }}>
                        " {solicitud.motivo} "
                    </div>
                </div>

                {error && (
                    <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#fef2f2', 
                        color: '#b91c1c', 
                        borderRadius: '6px', 
                        fontSize: '0.85rem', 
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid #fecaca'
                    }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {isAprobar && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Fecha Límite de Subsanación *
                            </label>
                            <input 
                                type="date"
                                className="form-control"
                                value={fechaLimite}
                                onChange={(e) => setFechaLimite(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                required={isAprobar}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                El contratista tendrá hasta esta fecha para realizar los cambios.
                            </p>
                        </div>
                    )}

                    <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            <MessageSquare size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {isAprobar ? 'Comentarios Adicionales (Opcional)' : 'Motivo del Rechazo *'}
                        </label>
                        <textarea 
                            className="form-control"
                            rows="4"
                            value={respuesta}
                            onChange={(e) => setRespuesta(e.target.value)}
                            placeholder={isAprobar ? 'Instrucciones para la subsanación...' : 'Indique por qué no se autoriza la reapertura...'}
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem',
                                resize: 'none'
                            }}
                            required={!isAprobar}
                        />
                    </div>
                </form>
            </div>
        </Modal>
    );
}

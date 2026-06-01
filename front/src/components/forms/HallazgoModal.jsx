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
            title={isEdit ? 'Revisión de Hallazgo' : 'Registro de Hallazgo / No Conformidad'}
            footer={footerButtons}
            maxWidth="max-w-xl"
        >
            {/* Header: Ficha Style */}
            <div style={{
                marginBottom: '20px',
                padding: '1.5rem',
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                borderLeft: `6px solid ${tipo === 'no_conformidad' ? '#ef4444' : tipo === 'observacion' ? '#f59e0b' : '#3b82f6'}`,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                            Código de Identificación
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                            ACT-{actividad?.codigo || '000'}
                        </div>
                    </div>
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: currentTypeConfig.color.split(' ')[1],
                        color: currentTypeConfig.color.split(' ')[0].replace('text-', '')
                    }}>
                        {currentTypeConfig.label}
                    </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <strong>Descripción de Actividad:</strong> {actividad?.descripcion}
                </div>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} id="form-hallazgo">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label htmlFor="hallazgo-tipo" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Clasificación del Hallazgo
                        </label>
                        <div style={{ position: 'relative' }}>
                            <select
                                id="hallazgo-tipo"
                                className="form-control"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', paddingLeft: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#fff', appearance: 'none'
                                }}
                            >
                                <option value="no_conformidad">No Conformidad</option>
                                <option value="observacion">Observación</option>
                                <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                            </select>
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                                <CurrentIcon size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="hallazgo-fecha" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Plazo de Subsanación
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="hallazgo-fecha"
                                type="date"
                                className="form-control"
                                value={fechaLimite}
                                onChange={(e) => setFechaLimite(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                style={{ width: '100%', padding: '10px 12px', paddingLeft: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                            />
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                                <Clock size={16} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="hallazgo-descripcion" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Detalle del Hallazgo (Evidencia Detectada)
                    </label>
                    <textarea
                        id="hallazgo-descripcion"
                        className="form-control"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows="4"
                        required
                        placeholder="Describa el incumplimiento o la observación detectada..."
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '0.9rem', minHeight: '120px' }}
                    />
                </div>

                <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#1e40af', fontSize: '0.8rem', fontWeight: 600 }}>
                        <Info size={16} /> Nota de Auditoría
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#1e3a8a', marginTop: '4px' }}>
                        Al guardar este hallazgo, el contratista será notificado y se le exigirá cargar un plan de acción correctivo para cerrar el ciclo de auditoría.
                    </div>
                </div>
            </form>
        </Modal>
    );
}

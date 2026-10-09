import React, { useState, useEffect } from 'react';
import {
    X, AlertTriangle, CheckCircle2, Clock, Calendar, Building,
    MapPin, Briefcase, User, Save, FileText, ChevronRight, Shield
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';

const SEVERIDAD_CONFIG = {
    critico: { label: 'Crítico', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    mayor: { label: 'Mayor', bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    menor: { label: 'Menor', bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
    observacion: { label: 'Observación', bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
    no_conformidad: { label: 'No Conformidad', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    oportunidad_mejora: { label: 'Oportunidad Mejora', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }
};

const ESTADO_CONFIG = {
    abierto: { label: 'Abierto', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    en_proceso: { label: 'En Proceso', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    cerrado: { label: 'Cerrado', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
};

export default function FichaHallazgoModal({ isOpen, onClose, hallazgo, currentUser, onUpdateSuccess }) {
    if (!isOpen || !hallazgo) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isAdminContrato = currentUser?.role === 'administrador_contrato';
    const canEdit = isAdmin || isAdminContrato;

    const [tipo, setTipo] = useState(hallazgo.tipo || 'observacion');
    const [estado, setEstado] = useState(hallazgo.estado || 'abierto');
    const [descripcion, setDescripcion] = useState(hallazgo.descripcion || '');
    const [accionCorrectiva, setAccionCorrectiva] = useState(hallazgo.accion_correctiva || '');
    const [fechaLimite, setFechaLimite] = useState(hallazgo.fecha_limite ? hallazgo.fecha_limite.slice(0, 10) : '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTipo(hallazgo.tipo || 'observacion');
        setEstado(hallazgo.estado || 'abierto');
        setDescripcion(hallazgo.descripcion || '');
        setAccionCorrectiva(hallazgo.accion_correctiva || '');
        setFechaLimite(hallazgo.fecha_limite ? hallazgo.fecha_limite.slice(0, 10) : '');
    }, [hallazgo]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!canEdit) return;

        setSaving(true);
        const toastId = toast.loading('Guardando cambios en el hallazgo...');
        try {
            const payload = {
                tipo,
                estado,
                descripcion,
                accion_correctiva: accionCorrectiva,
                fecha_limite: fechaLimite || null
            };

            const res = await api.put(`/hallazgos/${hallazgo.id}`, payload);
            if (res.data?.success) {
                toast.success('Hallazgo actualizado correctamente', { id: toastId });
                if (onUpdateSuccess) onUpdateSuccess(res.data.data);
                onClose();
            } else {
                toast.error(res.data?.message || 'Error al actualizar', { id: toastId });
            }
        } catch (err) {
            console.error('Error updating hallazgo:', err);
            toast.error(err.response?.data?.message || 'Error al guardar cambios', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const act = hallazgo.registroActividad?.actividad;
    const elem = act?.elemento;
    const prog = elem?.programa || hallazgo.registro?.programa;
    const vinc = hallazgo.registro?.vinculacionEntidad;

    const sev = SEVERIDAD_CONFIG[tipo] || SEVERIDAD_CONFIG.observacion;
    const est = ESTADO_CONFIG[estado] || ESTADO_CONFIG.abierto;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '820px',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
            }}>
                {/* Header Corporativo Abastible */}
                <div style={{
                    padding: '20px 24px', background: '#003594', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '3px solid #fe5000'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.15)', padding: '10px',
                            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <AlertTriangle size={24} color="#ffffff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                                    Ficha Técnica de Hallazgo #{hallazgo.id}
                                </h2>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                                    background: est.bg, color: est.text, border: `1px solid ${est.border}`
                                }}>
                                    {est.label}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                Auditoría Operacional OIEM | Abastible S.A.
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#ffffff',
                            cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body scrollable */}
                <form onSubmit={handleSave} style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Tarjeta de Trazabilidad Jerárquica */}
                    <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                        padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Programa</span>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#003594', marginTop: '2px' }}>
                                {prog?.nombre || 'General'}
                            </div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Elemento</span>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                                {elem ? `${elem.codigo || ''} - ${elem.nombre || ''}` : '-'}
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Actividad Evaluada</span>
                            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#334155', marginTop: '2px' }}>
                                {act ? `${act.codigo || ''} - ${act.nombre || ''}` : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Fila de Contexto Operativo (Empresa, Planta, Auditor) */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'
                    }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                <Building size={14} /> EMPRESA CONTRATISTA
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                                {vinc?.contratista?.nombre || hallazgo.registro?.eecc_nombre || '-'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {vinc?.contratista?.rut || ''}
                            </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                <MapPin size={14} /> PLANTA / DEPENDENCIA
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                                {vinc?.dependencia?.nombre || '-'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Servicio: {vinc?.servicio?.nombre || '-'}
                            </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                <User size={14} /> AUDITOR RESPONSABLE
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                                {hallazgo.auditor?.name || 'Sistema OIEM'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {hallazgo.created_at ? new Date(hallazgo.created_at).toLocaleDateString('es-CL') : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Campos Editables / Ficha */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Clasificación del Hallazgo
                            </label>
                            {canEdit ? (
                                <select
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff'
                                    }}
                                >
                                    <option value="critico">Crítico</option>
                                    <option value="mayor">Mayor</option>
                                    <option value="menor">Menor</option>
                                    <option value="observacion">Observación</option>
                                    <option value="no_conformidad">No Conformidad</option>
                                    <option value="oportunidad_mejora">Oportunidad de Mejora</option>
                                </select>
                            ) : (
                                <div style={{
                                    padding: '8px 12px', borderRadius: '8px', background: sev.bg,
                                    color: sev.text, border: `1px solid ${sev.border}`, fontWeight: 600, fontSize: '0.85rem'
                                }}>
                                    {sev.label}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Estado del Hallazgo
                            </label>
                            {canEdit ? (
                                <select
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff',
                                        fontWeight: 600, color: est.text
                                    }}
                                >
                                    <option value="abierto">Abierto</option>
                                    <option value="en_proceso">En Proceso</option>
                                    <option value="cerrado">Cerrado</option>
                                </select>
                            ) : (
                                <div style={{
                                    padding: '8px 12px', borderRadius: '8px', background: est.bg,
                                    color: est.text, border: `1px solid ${est.border}`, fontWeight: 600, fontSize: '0.85rem'
                                }}>
                                    {est.label}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Fecha Límite de Subsanación
                            </label>
                            {canEdit ? (
                                <input
                                    type="date"
                                    value={fechaLimite}
                                    onChange={(e) => setFechaLimite(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff'
                                    }}
                                />
                            ) : (
                                <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                    {fechaLimite || 'No establecida'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Descripción Detallada */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Descripción y Evidencia del Hallazgo
                        </label>
                        {canEdit ? (
                            <textarea
                                rows={4}
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                required
                                placeholder="Detalle exhaustivo de la desviación, observación o no conformidad detectada..."
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical'
                                }}
                            />
                        ) : (
                            <div style={{
                                padding: '14px', borderRadius: '8px', background: '#f8fafc',
                                border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.6,
                                whiteSpace: 'pre-wrap'
                            }}>
                                {descripcion || 'Sin descripción detallada.'}
                            </div>
                        )}
                    </div>

                    {/* Plan de Acción Correctivo */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Acción Correctiva / Mitigación Comprometida
                        </label>
                        {canEdit ? (
                            <textarea
                                rows={3}
                                value={accionCorrectiva}
                                onChange={(e) => setAccionCorrectiva(e.target.value)}
                                placeholder="Plan de mitigación o acción inmediata requerida..."
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical'
                                }}
                            />
                        ) : (
                            <div style={{
                                padding: '14px', borderRadius: '8px', background: '#f8fafc',
                                border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.6,
                                whiteSpace: 'pre-wrap'
                            }}>
                                {accionCorrectiva || 'Sin plan de acción registrado aún.'}
                            </div>
                        )}
                    </div>

                    {/* Compromisos Asociados */}
                    {hallazgo.compromisos && hallazgo.compromisos.length > 0 && (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 700, color: '#003594', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} /> Compromisos Vinculados ({hallazgo.compromisos.length})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {hallazgo.compromisos.map(c => (
                                    <div key={c.id} style={{
                                        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                                                Compromiso #{c.id}: {c.descripcion}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                Fecha límite: {c.fecha_compromiso || '-'} | Responsable: {c.responsabilidad?.toUpperCase()}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                                            background: c.estado === 'cumplido' ? '#f0fdf4' : '#fffbeb',
                                            color: c.estado === 'cumplido' ? '#16a34a' : '#d97706'
                                        }}>
                                            {c.estado?.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer con Acciones */}
                    <div style={{
                        marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1',
                                background: '#ffffff', color: '#475569', fontSize: '0.9rem', fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar Ficha
                        </button>
                        {canEdit && (
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                                    background: '#003594', color: '#ffffff', fontSize: '0.9rem', fontWeight: 600,
                                    cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <Save size={16} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

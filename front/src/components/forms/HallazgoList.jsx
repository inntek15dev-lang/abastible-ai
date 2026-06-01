import { useState } from 'react';
import { Edit2, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../../api';

export default function HallazgoList({ hallazgos, onEdit, onDelete, onCompromiso, canCreateCompromiso, readOnly = false }) {
    if (!hallazgos || hallazgos.length === 0) {
        return <div className="text-gray-500 text-sm italic">No hay hallazgos registrados.</div>;
    }

    const getSeverityColor = (tipo) => {
        switch (tipo) {
            case 'no_conformidad': return 'border-l-4 border-red-500 bg-red-50';
            case 'observacion': return 'border-l-4 border-yellow-500 bg-yellow-50';
            case 'oportunidad_mejora': return 'border-l-4 border-blue-500 bg-blue-50';
            default: return 'border-l-4 border-gray-300 bg-gray-50';
        }
    };

    const getSeverityLabel = (tipo) => {
        switch (tipo) {
            case 'no_conformidad': return 'No Conformidad';
            case 'observacion': return 'Observación';
            case 'oportunidad_mejora': return 'Oportunidad de Mejora';
            default: return tipo;
        }
    };

    return (
        <div className="space-y-3">
            {hallazgos.map((h) => (
                <div key={h.id} className={`p-3 rounded shadow-sm ${getSeverityColor(h.tipo)}`} style={{ marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '4px', borderLeftWidth: '4px' }}>
                    <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div className="font-medium text-sm text-gray-900" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                {getSeverityLabel(h.tipo)}
                            </div>
                            <div className="text-sm text-gray-700 mt-1" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                {h.descripcion}
                            </div>
                            <div className="text-xs text-gray-500 mt-2 flex items-center gap-2" style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span>📅 {new Date(h.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className={`flex items-center gap-1 ${h.estado === 'cerrado' ? 'text-green-600' : 'text-orange-600'}`}>
                                    {h.estado === 'cerrado' ? <CheckCircle size={12} /> : <Clock size={12} />}
                                    {h.estado}
                                </span>

                                {h.compromisos && h.compromisos.length > 0 && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                        📝 Compromiso: {h.compromisos[0].estado}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                            {canCreateCompromiso && (!h.compromisos || h.compromisos.length === 0) && h.estado !== 'cerrado' && (
                                <button
                                    onClick={() => onCompromiso(h)}
                                    className="p-1 hover:bg-white rounded text-indigo-600 transition-colors"
                                    title="Crear Compromiso"
                                    style={{ padding: '4px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#4f46e5' }}
                                >
                                    📝
                                </button>
                            )}

                            {!readOnly && (
                                <>
                                    <button
                                        onClick={() => onEdit(h)}
                                        className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                        title="Editar"
                                        style={{ padding: '4px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#003594' }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(h.id)}
                                        className="p-1 hover:bg-white rounded text-red-600 transition-colors"
                                        title="Eliminar"
                                        style={{ padding: '4px', cursor: 'pointer', border: 'none', background: 'transparent', color: '#dc2626' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

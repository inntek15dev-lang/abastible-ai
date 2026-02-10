// IEEE Trace: REQ-012 | US-052 | components/TraceabilityPanel.jsx
import { useEffect, useState } from 'react';
import { Clock, User, Shield, Info, Edit, CheckCircle, X } from 'lucide-react';
import api from '../api';
import Modal from './ui/Modal';

export default function TraceabilityPanel({ isOpen, onClose, registroId }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && registroId) {
            fetchLogs();
        }
    }, [isOpen, registroId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/registros/${registroId}`);
            if (response.data.data.logs) {
                setLogs(response.data.data.logs.sort((a, b) => b.id - a.id));
            }
        } catch (error) {
            console.error("Error fetching logs", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREAR': return <CheckCircle size={16} className="text-green-600" />;
            case 'EDITAR': return <Edit size={16} className="text-blue-600" />;
            case 'AUDITAR': return <Shield size={16} className="text-orange-600" />;
            default: return <Info size={16} className="text-gray-600" />;
        }
    };

    const getDiffView = (log) => {
        if (!log.datos_anteriores || !log.datos_nuevos) return null;

        const changes = [];
        Object.keys(log.datos_nuevos).forEach(key => {
            if (['updated_at', 'created_at', 'id'].includes(key)) return;
            const oldVal = log.datos_anteriores[key];
            const newVal = log.datos_nuevos[key];
            if (oldVal != newVal) {
                changes.push({ key, oldVal, newVal });
            }
        });

        if (changes.length === 0) return null;

        return (
            <div className="mt-2 bg-gray-50 p-2 rounded text-xs border border-gray-200">
                {changes.map((change, idx) => (
                    <div key={idx} className="flex flex-col mb-1 last:mb-0">
                        <span className="font-semibold text-gray-500 uppercase" style={{ fontSize: '0.65rem' }}>{change.key.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                            <span className="line-through text-red-400">{String(change.oldVal || '-')}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-bold text-green-600">{String(change.newVal)}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            padding="p-0"
            noHeader={true}
        >
            {/* Header Purple */}
            <div className="bg-purple-600 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white">
                    <div className="bg-white/20 p-1 rounded">
                        <Clock size={18} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">
                        Trazabilidad - {logs.length > 0 && logs[0].created_at ?
                            new Date(logs[0].created_at).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }) :
                            'Registro'}
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 bg-gray-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                        <Info size={40} className="text-gray-300" />
                        <p>No hay historial de trazabilidad disponible.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
                                {/* Icon Column */}
                                <div className="flex-shrink-0 pt-1">
                                    {log.accion === 'CREAR' && (
                                        <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-bold border border-orange-100 flex items-center gap-1 uppercase">
                                            <Edit size={12} /> CREAR
                                        </div>
                                    )}
                                    {log.accion === 'EDITAR' && (
                                        <div className="bg-green-50 text-green-600 px-2 py-1 rounded text-[10px] font-bold border border-green-100 flex items-center gap-1 uppercase">
                                            <Edit size={12} /> EDITAR
                                        </div>
                                    )}
                                    {/* Fallback for others */}
                                    {!['CREAR', 'EDITAR'].includes(log.accion) && (
                                        <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 flex items-center gap-1 uppercase">
                                            <Info size={12} /> {log.accion}
                                        </div>
                                    )}
                                </div>

                                {/* Content Column */}
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                                        {log.descripcion || `Registro ${log.accion.toLowerCase()}`}
                                    </h4>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                        <div className="flex items-center gap-1">
                                            <User size={12} />
                                            {log.usuario?.name || 'Sistema'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatDate(log.created_at)}
                                        </div>
                                    </div>

                                    {/* Diff View */}
                                    {log.accion === 'EDITAR' && getDiffView(log)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center rounded-b-2xl">
                <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <span className="text-lg">📄</span> Exportar PDF
                </button>
                <button
                    onClick={onClose}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </Modal>
    );
}

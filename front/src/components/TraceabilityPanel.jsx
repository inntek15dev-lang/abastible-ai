// IEEE Trace: REQ-012 | US-052 | components/TraceabilityPanel.jsx
import { useEffect, useState } from 'react';
import { Clock, User, Shield, Info, Edit, CheckCircle, X, FileText, Send, Lock } from 'lucide-react';
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

    const getIconForAction = (action) => {
        switch (action) {
            case 'CREAR': return <Edit size={14} className="text-green-600" />;
            case 'EDITAR': return <Edit size={14} className="text-blue-600" />;
            case 'AUDITAR': return <Shield size={14} className="text-orange-600" />;
            case 'FINALIZAR_AUDITORIA': return <CheckCircle size={14} className="text-green-600" />;
            case 'REABRIR': return <Lock size={14} className="text-yellow-600" />;
            default: return <Info size={14} className="text-gray-600" />;
        }
    };

    const getBgColorForAction = (action) => {
        switch (action) {
            case 'CREAR': return '#dcfce7'; // green-100
            case 'EDITAR': return '#dbeafe'; // blue-100
            case 'AUDITAR': return '#ffedd5'; // orange-100
            case 'FINALIZAR_AUDITORIA': return '#dcfce7';
            case 'REABRIR': return '#fef9c3'; // yellow-100
            default: return '#f3f4f6'; // gray-100
        }
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

    const title = 'Trazabilidad del Registro';

    const footerButtons = (
        <>
            <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}>
                <FileText size={16} /> Exportar PDF
            </button>
            <button
                onClick={onClose}
                className="btn-secondary"
            >
                Cerrar
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-xl"
            title={title}
            footer={footerButtons}
        >
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                        <Info size={40} className="text-gray-300" />
                        <p>No hay historial de trazabilidad disponible.</p>
                    </div>
                ) : (
                    <div className="timeline-container" style={{ marginTop: '10px' }}>
                        {logs.map((log) => (
                            <div key={log.id} className="timeline-item">
                                <div className="timeline-icon" style={{ background: getBgColorForAction(log.accion) }}>
                                    {getIconForAction(log.accion)}
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-gray-800 text-sm">
                                            {log.accion === 'CREAR' ? 'Registro Creado' :
                                                log.accion === 'FINALIZAR_AUDITORIA' ? 'Auditoría Completada' :
                                                    log.accion === 'REABRIR' ? 'Solicitud de Reapertura' :
                                                        log.accion}
                                        </h4>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={12} /> {formatDate(log.created_at)}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-600 mb-2">
                                        {log.descripcion || 'Sin descripción'}
                                    </p>

                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <User size={12} />
                                        <span className="font-medium">{log.usuario?.name || 'Sistema'}</span>
                                    </div>

                                    {/* Diff View for Edits */}
                                    {log.accion === 'EDITAR' && log.datos_anteriores && (
                                        <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                                            <div className="font-semibold text-gray-500 mb-1">Cambios realizados:</div>
                                            {Object.keys(log.datos_nuevos).filter(k => !['updated_at', 'id'].includes(k) && log.datos_anteriores[k] != log.datos_nuevos[k]).map(key => (
                                                <div key={key} className="flex gap-2">
                                                    <span className="text-gray-400">{key}:</span>
                                                    <span className="line-through text-red-400">{String(log.datos_anteriores[key])}</span>
                                                    <span>→</span>
                                                    <span className="text-green-600 font-bold">{String(log.datos_nuevos[key])}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

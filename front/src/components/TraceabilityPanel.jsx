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
            case 'CREAR': return '#ecfdf5'; // green-50
            case 'EDITAR': return '#f0f9ff'; // sky-50
            case 'AUDITAR': return '#fff7ed'; // orange-50
            case 'FINALIZAR_AUDITORIA': return '#ecfdf5';
            case 'REABRIR': return '#fffbeb'; // amber-50
            default: return '#f9fafb'; // gray-50
        }
    };

    const getTextColorForAction = (action) => {
        switch (action) {
            case 'CREAR': return '#059669'; // green-600
            case 'EDITAR': return '#0284c7'; // sky-600
            case 'AUDITAR': return '#ea580c'; // orange-600
            case 'FINALIZAR_AUDITORIA': return '#059669';
            case 'REABRIR': return '#d97706'; // amber-600
            default: return '#4b5563'; // gray-600
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
                                {/* Timeline Dot */}
                                <div className="timeline-icon" style={{ background: '#f3f4f6', borderColor: '#e5e7eb' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af' }}></div>
                                </div>

                                {/* Card Content */}
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">

                                    {/* Action Badge */}
                                    <div style={{
                                        minWidth: '160px', // Fixed width for alignment 
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        background: getBgColorForAction(log.accion),
                                        color: getTextColorForAction(log.accion),
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        {getIconForAction(log.accion)}
                                        <span>
                                            {log.accion === 'CREAR' ? 'Registro Creado' :
                                                log.accion === 'FINALIZAR_AUDITORIA' ? 'Auditoría Completada' :
                                                    log.accion === 'REABRIR' ? 'Solicitud de Reapertura' :
                                                        log.accion === 'SUBSANACION' ? 'Subsanación Enviada' : // Handle implicit logic if exists or generic
                                                            log.accion === 'AUDITAR' ? 'Auditoría en proceso' :
                                                                log.accion}
                                        </span>
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex-1">
                                        {/* Description / Main Title */}
                                        <div className="text-gray-700 font-medium text-sm mb-2">
                                            {log.descripcion || 'Sin descripción disponible'}
                                            {log.accion === 'FINALIZAR_AUDITORIA' && log.datos_nuevos?.porcentaje && (
                                                <span> - Cumplimiento: {log.datos_nuevos.porcentaje}%</span>
                                            )}
                                        </div>

                                        {/* Metadata (User & Date) */}
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <User size={12} className="text-gray-400" />
                                                <span className="font-medium text-gray-500">{log.usuario?.name || 'Sistema'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div style={{ width: '12px', height: '12px', background: '#e0e7ff', borderRadius: '2px', display: 'grid', placeItems: 'center', color: '#6366f1', fontSize: '8px', fontWeight: 'bold' }}>📅</div>
                                                <span className="text-gray-400">{formatDate(log.created_at)}</span>
                                            </div>
                                        </div>

                                        {/* Diff View (if needed, kept conditional but styled) */}
                                        {log.accion === 'EDITAR' && log.datos_anteriores && (
                                            <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                                <div className="font-semibold text-gray-500 mb-1">Detalle de cambios:</div>
                                                {Object.keys(log.datos_nuevos).filter(k => !['updated_at', 'id'].includes(k) && log.datos_anteriores[k] != log.datos_nuevos[k]).map(key => (
                                                    <div key={key} className="flex gap-2">
                                                        <span className="text-gray-400">{key}:</span>
                                                        <span className="line-through text-red-300">{String(log.datos_anteriores[key])}</span>
                                                        <span>→</span>
                                                        <span className="text-green-600">{String(log.datos_nuevos[key])}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

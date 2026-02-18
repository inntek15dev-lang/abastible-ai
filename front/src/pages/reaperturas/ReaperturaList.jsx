// IEEE Trace: REQ-004 | US-004 | pages/reaperturas/ReaperturaList.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

import { RefreshCw, Check, X, Clock, Calendar, User, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function ReaperturaList() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [filter, setFilter] = useState('all');
    const { user, canWrite } = useAuth();

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [actionType, setActionType] = useState(null); // 'aprobar' | 'rechazar'
    const [actionReason, setActionReason] = useState('');

    const isAdmin = ['admin', 'administrador_contrato'].includes(user?.role);

    useEffect(() => {
        fetchSolicitudes();
    }, [filter]);

    const fetchSolicitudes = async () => {
        try {
            let params = {};
            if (filter !== 'all') params.estado = filter;

            const response = await api.get('/reaperturas', { params });
            setSolicitudes(response.data.data);
        } catch (err) {
            setError('Error al cargar solicitudes');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (solicitud, type) => {
        setSelectedSolicitud(solicitud);
        setActionType(type);
        setActionReason('');
        setModalOpen(true);
    };

    const submitAction = async () => {
        if (actionType === 'rechazar' && !actionReason.trim()) {
            setError('Debe proporcionar una razón para rechazar');
            return;
        }

        try {
            const endpoint = `/reaperturas/${selectedSolicitud.id}/${actionType}`;
            await api.put(endpoint, { respuesta: actionReason });
            setModalOpen(false);
            fetchSolicitudes();
        } catch (err) {
            setError(err.response?.data?.message || `Error al ${actionType}`);
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'aprobada': return <Check className="text-success" size={20} />;
            case 'rechazada': return <X className="text-danger" size={20} />;
            default: return <Clock className="text-warning" size={20} />;
        }
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>
                    <RefreshCw size={24} style={{ marginRight: 10 }} />
                    Solicitudes de Reapertura
                </h1>
                <div className="filter-tabs">
                    {['all', 'pendiente', 'aprobada', 'rechazada'].map((f) => (
                        <button
                            key={f}
                            className={`filter-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Estado</th>
                            <th>Registro</th>
                            <th>Solicitante</th>
                            <th>Motivo</th>
                            <th>Fecha</th>
                            {isAdmin && <th>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {solicitudes.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 5} className="empty-row">
                                    No hay solicitudes
                                </td>
                            </tr>
                        ) : (
                            solicitudes.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {getEstadoIcon(s.estado)}
                                            <span className={`badge ${s.estado}`}>{s.estado}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {s.registro?.periodo} - {s.registro?.eecc_nombre || 'Sin EECC'}
                                    </td>
                                    <td>
                                        <div className="meta-item">
                                            <User size={14} />
                                            {s.solicitante?.name}
                                        </div>
                                    </td>
                                    <td>{s.motivo?.substring(0, 50)}...</td>
                                    <td>
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            {new Date(s.created_at).toLocaleDateString('es-CL')}
                                        </div>
                                    </td>
                                    {isAdmin && (
                                        <td>
                                            {s.estado === 'pendiente' ? (
                                                <div className="actions-cell">
                                                    <button
                                                        className="btn-audit success btn-reapertura-aprobar"
                                                        onClick={() => openModal(s, 'aprobar')}
                                                    >
                                                        <Check size={16} /> Aprobar
                                                    </button>
                                                    <button
                                                        className="btn-audit danger btn-reapertura-rechazar"
                                                        onClick={() => openModal(s, 'rechazar')}
                                                    >
                                                        <X size={16} /> Rechazar
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="respuesta-text">
                                                    {s.respuesta?.substring(0, 30) || '-'}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={actionType === 'aprobar' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
            >
                <div className="flex flex-col gap-4">
                    {actionType === 'rechazar' && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} />
                            <span>Esta acción es irreversible. El contratista deberá corregir y volver a enviar.</span>
                        </div>
                    )}

                    <p className="text-sm text-gray-600">
                        {actionType === 'aprobar'
                            ? 'Puede agregar un comentario opcional para el contratista.'
                            : 'Debe indicar la razón del rechazo para que el contratista sepa qué corregir.'}
                    </p>

                    <textarea
                        id="txt-motivo-reapertura"
                        className="form-control"
                        rows={3}
                        placeholder={actionType === 'aprobar' ? "Comentario opcional..." : "Razón del rechazo..."}
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            id="btn-confirmar-reapertura-action"
                            onClick={submitAction}
                            disabled={actionType === 'rechazar' && !actionReason.trim()}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${actionType === 'aprobar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            Confirmar {actionType === 'aprobar' ? 'Aprobación' : 'Rechazo'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

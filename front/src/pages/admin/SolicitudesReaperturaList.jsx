import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Check, X, RefreshCw, FileText } from 'lucide-react';

export default function SolicitudesReaperturaList() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, canExec, canWrite } = useAuth();
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const fetchSolicitudes = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reaperturas?estado=pendiente'); // Default to pending
            setSolicitudes(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        if (!window.confirm(`¿Seguro que desea ${action} esta solicitud?`)) return;

        const endpoint = action === 'aprobar' ? 'aprobar' : 'rechazar';
        const motivo = action === 'rechazar' ? prompt('Motivo del rechazo:') : 'Aprobado';

        if (action === 'rechazar' && !motivo) return;

        setProcessing(id);
        try {
            await api.put(`/reaperturas/${id}/${endpoint}`, { respuesta: motivo });
            alert(`Solicitud ${action === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`);
            fetchSolicitudes();
        } catch (error) {
            alert(error.response?.data?.message || 'Error procesando solicitud');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div>Cargando solicitudes...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Solicitudes de Reapertura</h1>
                <button onClick={fetchSolicitudes} className="btn-secondary">
                    <RefreshCw size={18} /> Actualizar
                </button>
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Registro</th>
                            <th>Empresa</th>
                            <th>Solicitante</th>
                            <th>Motivo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {solicitudes.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No hay solicitudes pendientes.
                                </td>
                            </tr>
                        ) : (
                            solicitudes.map(s => (
                                <tr key={s.id}>
                                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FileText size={16} />
                                            {s.registro.periodo}
                                        </div>
                                    </td>
                                    <td>{s.registro.eecc_nombre}</td>
                                    <td>
                                        <div>{s.solicitante.name}</div>
                                        <small className="text-muted">{s.solicitante.email}</small>
                                    </td>
                                    <td style={{ maxWidth: '300px' }}>
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.motivo}</p>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {canWrite('Auditoria') && (
                                                <>
                                                    <button
                                                        className="btn-icon success btn-reapertura-aprobar"
                                                        onClick={() => handleAction(s.id, 'aprobar')}
                                                        disabled={processing === s.id}
                                                        title="Aprobar"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        className="btn-icon danger btn-reapertura-rechazar"
                                                        onClick={() => handleAction(s.id, 'rechazar')}
                                                        disabled={processing === s.id}
                                                        title="Rechazar"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// IEEE Trace: REQ-004 | US-004 | pages/reaperturas/ReaperturaList.jsx
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

import {
    RefreshCw,
    Check,
    X,
    Clock,
    Calendar,
    User,
    AlertTriangle,
    Mail,
    Send,
    UserCheck,
    Building2,
    MapPin,
    Briefcase,
    CheckCircle2
} from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function ReaperturaList() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successBanner, setSuccessBanner] = useState('');

    // Filtros
    const [filter, setFilter] = useState('all');
    const [periodo, setPeriodo] = useState('');
    const [selectedAdc, setSelectedAdc] = useState('todos');
    const [adcList, setAdcList] = useState([]);

    const { user, canWrite } = useAuth();

    // Modal de Aprobación / Rechazo
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [actionType, setActionType] = useState(null); // 'aprobar' | 'rechazar'
    const [actionReason, setActionReason] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // Modal de Envío de Correo a Admin Contrato
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailTargetAdc, setEmailTargetAdc] = useState('');
    const [emailPeriodoScope, setEmailPeriodoScope] = useState('current'); // 'current' | 'all'
    const [emailCustomMessage, setEmailCustomMessage] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

    const isAdmin = ['admin', 'administrador_contrato'].includes(user?.role);

    useEffect(() => {
        fetchAdcList();
    }, []);

    useEffect(() => {
        fetchSolicitudes();
    }, [filter, periodo, selectedAdc]);

    const fetchAdcList = async () => {
        try {
            const response = await api.get('/resources/adc');
            setAdcList(response.data?.data || []);
        } catch (err) {
            console.error('Error al cargar administradores de contrato:', err);
        }
    };

    const fetchSolicitudes = async () => {
        try {
            setLoading(true);
            setError('');
            let params = {};
            if (filter !== 'all') params.estado = filter;
            if (periodo) params.periodo = periodo;
            if (selectedAdc && selectedAdc !== 'todos') params.adc_id = selectedAdc;

            const response = await api.get('/reaperturas', { params });
            setSolicitudes(response.data?.data || []);
        } catch (err) {
            setError('Error al cargar las solicitudes de reapertura');
        } finally {
            setLoading(false);
        }
    };

    const getVinculacionInfo = (s) => {
        const v = s.registro?.vinculacionEntidad;
        const gerencia = v?.gerencia?.nombre || v?.dependencia?.subgerencia?.gerencia?.nombre || '-';
        const subgerencia = v?.subgerencia?.nombre || v?.dependencia?.subgerencia?.nombre || '-';
        const servicio = v?.servicio?.nombre || '-';
        const planta = v?.dependencia?.nombre || '-';
        const contratista = s.registro?.eecc_nombre || v?.contratista?.nombre || 'Sin EECC';
        const admins = v?.administraciones?.map(a => a.administradorContrato).filter(Boolean) || [];
        return { gerencia, subgerencia, servicio, planta, contratista, admins };
    };

    const openModal = (solicitud, type) => {
        setSelectedSolicitud(solicitud);
        setActionType(type);
        setActionReason('');
        setFechaLimite('');
        setModalOpen(true);
    };

    const submitAction = async () => {
        if (actionType === 'rechazar' && !actionReason.trim()) {
            setError('Debe proporcionar una razón para rechazar');
            return;
        }

        try {
            setIsSubmittingAction(true);
            const endpoint = `/reaperturas/${selectedSolicitud.id}/${actionType}`;
            await api.put(endpoint, {
                respuesta: actionReason,
                fecha_limite: actionType === 'aprobar' ? fechaLimite : undefined
            });
            setModalOpen(false);
            setSuccessBanner(`Solicitud de reapertura ${actionType === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente.`);
            setTimeout(() => setSuccessBanner(''), 5000);
            fetchSolicitudes();
        } catch (err) {
            setError(err.response?.data?.message || `Error al ${actionType}`);
        } finally {
            setIsSubmittingAction(false);
        }
    };

    // Apertura del modal de email
    const openEmailModal = (specificAdcId = null) => {
        setEmailError('');
        if (specificAdcId) {
            setEmailTargetAdc(String(specificAdcId));
        } else if (selectedAdc && selectedAdc !== 'todos') {
            setEmailTargetAdc(String(selectedAdc));
        } else if (adcList.length > 0) {
            setEmailTargetAdc(String(adcList[0].id));
        } else {
            setEmailTargetAdc('');
        }
        setEmailPeriodoScope(periodo ? 'current' : 'all');
        setEmailCustomMessage('');
        setEmailModalOpen(true);
    };

    const handleSendEmailAdc = async () => {
        if (!emailTargetAdc) {
            setEmailError('Debe seleccionar un Administrador de Contrato.');
            return;
        }

        try {
            setEmailLoading(true);
            setEmailError('');
            const periodoToSend = emailPeriodoScope === 'current' && periodo ? periodo : undefined;

            const res = await api.post('/reaperturas/notificar-adc', {
                adc_id: emailTargetAdc,
                periodo: periodoToSend,
                mensaje: emailCustomMessage || undefined
            });

            setEmailModalOpen(false);
            setSuccessBanner(res.data?.message || 'Correo enviado exitosamente al Administrador de Contrato.');
            setTimeout(() => setSuccessBanner(''), 6000);
        } catch (err) {
            setEmailError(err.response?.data?.message || 'Error al enviar el correo al Administrador de Contrato.');
        } finally {
            setEmailLoading(false);
        }
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'aprobada': return <Check className="text-success" size={18} />;
            case 'rechazada': return <X className="text-danger" size={18} />;
            default: return <Clock className="text-warning" size={18} />;
        }
    };

    // Conteo para KPI rápidos
    const counts = useMemo(() => {
        const total = solicitudes.length;
        const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
        const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
        const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;
        return { total, pendientes, aprobadas, rechazadas };
    }, [solicitudes]);

    return (
        <div className="page-container" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
                            <RefreshCw size={26} color="#2563eb" />
                            Gestión de Solicitudes de Reapertura
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Administración, trazabilidad y notificación de reaperturas solicitadas por empresas contratistas.
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            id="btn-enviar-mail-adc-top"
                            className="btn-primary"
                            onClick={() => openEmailModal()}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                            title="Enviar correo con la tabla de solicitudes pendientes al Administrador de Contrato"
                        >
                            <Mail size={18} />
                            <span>Enviar Pendientes a Admin Contrato</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Banner de éxito */}
            {successBanner && (
                <div style={{
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}>
                    <CheckCircle2 size={18} color="#059669" />
                    <span>{successBanner}</span>
                </div>
            )}

            {/* Barra de Filtros */}
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px 20px',
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    
                    {/* Filtro Tabs de Estado */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                            Estado de Solicitud
                        </span>
                        <div className="filter-tabs" style={{ display: 'flex', gap: '6px' }}>
                            {[
                                { key: 'all', label: `Todas (${counts.total})` },
                                { key: 'pendiente', label: `Pendientes (${counts.pendientes})` },
                                { key: 'aprobada', label: `Aprobadas (${counts.aprobadas})` },
                                { key: 'rechazada', label: `Rechazadas (${counts.rechazadas})` }
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    id={`tab-estado-${f.key}`}
                                    className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                                    onClick={() => setFilter(f.key)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '6px',
                                        border: filter === f.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                        backgroundColor: filter === f.key ? '#eff6ff' : '#ffffff',
                                        color: filter === f.key ? '#1d4ed8' : '#475569',
                                        fontWeight: filter === f.key ? 700 : 500,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filtro por Periodo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                        <label htmlFor="filter-periodo" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color="#64748b" /> Periodo (Mes)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                id="filter-periodo"
                                type="month"
                                className="form-control"
                                value={periodo}
                                onChange={(e) => setPeriodo(e.target.value)}
                                style={{
                                    height: '38px',
                                    padding: '0 10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    color: '#1e293b',
                                    outline: 'none'
                                }}
                            />
                            {periodo && (
                                <button
                                    id="btn-limpiar-periodo"
                                    type="button"
                                    onClick={() => setPeriodo('')}
                                    style={{
                                        height: '38px',
                                        padding: '0 10px',
                                        backgroundColor: '#f1f5f9',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        color: '#475569',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="Quitar filtro de periodo"
                                >
                                    <X size={14} /> Todos
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filtro por Admin Contrato */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '250px', flex: 1 }}>
                        <label htmlFor="filter-admin-contrato" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck size={14} color="#64748b" /> Administrador de Contrato
                        </label>
                        <select
                            id="filter-admin-contrato"
                            className="form-control"
                            value={selectedAdc}
                            onChange={(e) => setSelectedAdc(e.target.value)}
                            style={{
                                height: '38px',
                                padding: '0 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#1e293b',
                                backgroundColor: '#ffffff'
                            }}
                        >
                            <option value="todos">Todos los Administradores de Contrato</option>
                            {adcList.map(adc => (
                                <option key={adc.id} value={adc.id}>
                                    {adc.name} {adc.email ? `(${adc.email})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botón Refrescar */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            id="btn-refresh-solicitudes"
                            onClick={fetchSolicitudes}
                            className="btn-secondary"
                            style={{
                                height: '38px',
                                padding: '0 14px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 500
                            }}
                            title="Actualizar listado"
                        >
                            <RefreshCw size={14} />
                            <span>Actualizar</span>
                        </button>
                    </div>

                </div>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

            {/* Tabla de Solicitudes */}
            <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Estado</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Periodo & Empresa</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Gerencia</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Subgerencia</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Servicio</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Planta</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Admin Contrato</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Solicitante</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Motivo</th>
                            <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Fecha</th>
                            {isAdmin && <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={isAdmin ? 11 : 10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                        <RefreshCw size={20} className="spin" />
                                        <span>Cargando solicitudes de reapertura...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : solicitudes.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 11 : 10} className="empty-row" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    No se encontraron solicitudes de reapertura con los filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            solicitudes.map((s) => {
                                const { gerencia, subgerencia, servicio, planta, contratista, admins } = getVinculacionInfo(s);

                                return (
                                    <tr key={s.id} id={`row-reapertura-${s.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {/* Estado */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {getEstadoIcon(s.estado)}
                                                <span className={`badge ${s.estado}`} style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {s.estado === 'pendiente' ? 'Pendiente' : s.estado}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Periodo & Empresa */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                                {s.registro?.periodo || '-'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500, marginTop: '2px' }}>
                                                {contratista}
                                            </div>
                                        </td>

                                        {/* Gerencia */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Building2 size={13} color="#64748b" />
                                                <span>{gerencia}</span>
                                            </div>
                                        </td>

                                        {/* Subgerencia */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#334155' }}>
                                            <span>{subgerencia}</span>
                                        </td>

                                        {/* Servicio */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Briefcase size={13} color="#64748b" />
                                                <span style={{ fontWeight: 500 }}>{servicio}</span>
                                            </div>
                                        </td>

                                        {/* Planta */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={13} color="#64748b" />
                                                <span>{planta}</span>
                                            </div>
                                        </td>

                                        {/* Admin Contrato */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                            {admins.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    {admins.map((adm, i) => (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ color: '#1e293b', fontWeight: 500 }}>{adm.name}</span>
                                                            {isAdmin && adm.id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEmailModal(adm.id)}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: 'pointer',
                                                                        color: '#2563eb',
                                                                        padding: 0,
                                                                        display: 'inline-flex'
                                                                    }}
                                                                    title={`Enviar correo con pendientes a ${adm.name}`}
                                                                >
                                                                    <Mail size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Sin asignar</span>
                                            )}
                                        </td>

                                        {/* Solicitante */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                            <div style={{ fontWeight: 500, color: '#1e293b' }}>{s.solicitante?.name || '-'}</div>
                                            {s.solicitante?.email && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.solicitante.email}</div>
                                            )}
                                        </td>

                                        {/* Motivo */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.85rem' }}>
                                            <div style={{ maxWidth: '240px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.motivo}>
                                                {s.motivo || '-'}
                                            </div>
                                        </td>

                                        {/* Fecha */}
                                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {s.created_at ? new Date(s.created_at).toLocaleDateString('es-CL') : '-'}
                                        </td>

                                        {/* Acciones */}
                                        {isAdmin && (
                                            <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                {s.estado === 'pendiente' ? (
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button
                                                            id={`btn-aprobar-${s.id}`}
                                                            className="btn-audit success btn-reapertura-aprobar"
                                                            onClick={() => openModal(s, 'aprobar')}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '5px 10px',
                                                                backgroundColor: '#16a34a',
                                                                color: '#ffffff',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600
                                                            }}
                                                            title="Aprobar solicitud de reapertura"
                                                        >
                                                            <Check size={14} /> Aprobar
                                                        </button>
                                                        <button
                                                            id={`btn-rechazar-${s.id}`}
                                                            className="btn-audit danger btn-reapertura-rechazar"
                                                            onClick={() => openModal(s, 'rechazar')}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '5px 10px',
                                                                backgroundColor: '#dc2626',
                                                                color: '#ffffff',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600
                                                            }}
                                                            title="Rechazar solicitud de reapertura"
                                                        >
                                                            <X size={14} /> Rechazar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                                        {s.respuesta ? `"${s.respuesta.substring(0, 30)}..."` : 'Procesada'}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Aprobación / Rechazo */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={actionType === 'aprobar' ? 'Aprobar Solicitud de Reapertura' : 'Rechazar Solicitud de Reapertura'}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    {actionType === 'rechazar' && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#b91c1c',
                            padding: '12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '0.85rem'
                        }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>Esta acción es irreversible. El registro volverá a quedar en estado "Finalizado" y no podrá ser modificado por el contratista.</span>
                        </div>
                    )}

                    <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>
                        {actionType === 'aprobar'
                            ? 'Al aprobar, el registro pasará a "Pendiente Subsanación" para permitir al contratista corregir o subir evidencias faltantes.'
                            : 'Debe indicar el motivo o razón del rechazo para informar al contratista.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="txt-motivo-reapertura" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            {actionType === 'aprobar' ? 'Comentario o Instrucciones (Opcional):' : 'Razón del Rechazo (Obligatorio):'}
                        </label>
                        <textarea
                            id="txt-motivo-reapertura"
                            className="form-control"
                            rows={3}
                            placeholder={actionType === 'aprobar' ? 'Ingrese instrucciones para la subsanación...' : 'Indique por qué se rechaza la reapertura...'}
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {actionType === 'aprobar' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} color="#64748b" />
                                Fecha Límite de Subsanación (Opcional)
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={fechaLimite}
                                onChange={(e) => setFechaLimite(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                style={{
                                    height: '38px',
                                    padding: '0 10px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem'
                                }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Define el plazo máximo en el cual el contratista debe cargar sus subsanaciones.
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#475569',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            id="btn-confirmar-reapertura-action"
                            type="button"
                            onClick={submitAction}
                            disabled={isSubmittingAction || (actionType === 'rechazar' && !actionReason.trim())}
                            style={{
                                padding: '8px 18px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#ffffff',
                                backgroundColor: actionType === 'aprobar' ? '#16a34a' : '#dc2626',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isSubmittingAction ? 'not-allowed' : 'pointer',
                                opacity: isSubmittingAction || (actionType === 'rechazar' && !actionReason.trim()) ? 0.6 : 1
                            }}
                        >
                            {isSubmittingAction ? 'Procesando...' : `Confirmar ${actionType === 'aprobar' ? 'Aprobación' : 'Rechazo'}`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Envío de Correo a Admin Contrato */}
            <Modal
                isOpen={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                title="Enviar Resumen de Solicitudes Pendientes a Admin Contrato"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>
                        Este proceso genera y envía automáticamente un correo formal al Administrador de Contrato seleccionado con la tabla detallada de todas las solicitudes de reapertura pendientes correspondientes a sus contratos.
                    </p>

                    {emailError && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#b91c1c',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            fontSize: '0.85rem'
                        }}>
                            {emailError}
                        </div>
                    )}

                    {/* Selector de ADC */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="select-modal-adc" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            Destinatario (Administrador de Contrato):
                        </label>
                        <select
                            id="select-modal-adc"
                            className="form-control"
                            value={emailTargetAdc}
                            onChange={(e) => setEmailTargetAdc(e.target.value)}
                            style={{
                                height: '38px',
                                padding: '0 10px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#1e293b',
                                backgroundColor: '#ffffff'
                            }}
                        >
                            <option value="">-- Seleccionar Administrador de Contrato --</option>
                            {adcList.map(adc => (
                                <option key={adc.id} value={adc.id}>
                                    {adc.name} {adc.email ? `<${adc.email}>` : '(Sin email registrado)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Alcance de Periodo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            Alcance del Reporte:
                        </label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {periodo && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="emailPeriodoScope"
                                        value="current"
                                        checked={emailPeriodoScope === 'current'}
                                        onChange={() => setEmailPeriodoScope('current')}
                                    />
                                    <span>Solo periodo filtrado (<strong>{periodo}</strong>)</span>
                                </label>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="emailPeriodoScope"
                                    value="all"
                                    checked={emailPeriodoScope === 'all'}
                                    onChange={() => setEmailPeriodoScope('all')}
                                />
                                <span>Todas las pendientes (cualquier periodo)</span>
                            </label>
                        </div>
                    </div>

                    {/* Mensaje adicional opcional */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="txt-mensaje-adc-email" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            Mensaje o Instrucción Adicional (Opcional):
                        </label>
                        <textarea
                            id="txt-mensaje-adc-email"
                            className="form-control"
                            rows={3}
                            placeholder="Ej: Estimado, favor revisar y dar prioridad a las solicitudes de reapertura pendientes de este mes..."
                            value={emailCustomMessage}
                            onChange={(e) => setEmailCustomMessage(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setEmailModalOpen(false)}
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#475569',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            id="btn-confirmar-envio-mail-adc"
                            type="button"
                            onClick={handleSendEmailAdc}
                            disabled={emailLoading || !emailTargetAdc}
                            style={{
                                padding: '8px 18px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#ffffff',
                                backgroundColor: '#2563eb',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: emailLoading || !emailTargetAdc ? 'not-allowed' : 'pointer',
                                opacity: emailLoading || !emailTargetAdc ? 0.6 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Send size={15} />
                            <span>{emailLoading ? 'Enviando Correo...' : 'Enviar Correo'}</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

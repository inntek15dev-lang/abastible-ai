import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Megaphone,
    Plus,
    Search,
    Calendar,
    Users,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import AvisoPopupModal from '../../components/avisos/AvisoPopupModal';
import './AvisoList.css';

export default function AvisoList() {
    const { user } = useAuth();
    const [avisos, setAvisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('todos'); // 'todos' | 'vigente' | 'activo' | 'inactivo' | 'vencido'
    const [previewItem, setPreviewItem] = useState(null);

    const isAdminDios = user?.role === 'admin';

    const fetchAvisos = useCallback(async () => {
        try {
            setLoading(true);
            let url = '/avisos';
            const params = [];
            if (search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
            if (estadoFilter !== 'todos') params.push(`estado=${encodeURIComponent(estadoFilter)}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const response = await api.get(url);
            setAvisos(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching avisos:', error);
            toast.error(error.response?.data?.message || 'Error al cargar avisos');
        } finally {
            setLoading(false);
        }
    }, [search, estadoFilter]);

    useEffect(() => {
        if (isAdminDios) {
            fetchAvisos();
        }
    }, [fetchAvisos, isAdminDios]);

    const handleToggleActivo = async (aviso) => {
        try {
            const response = await api.patch(`/avisos/${aviso.id}/toggle-activo`);
            const updated = response.data?.data;
            setAvisos(prev => prev.map(a => (a.id === aviso.id ? { ...a, activo: updated.activo } : a)));
            toast.success(`Aviso ${updated.activo ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error('Error toggling activo:', error);
            toast.error('Error al cambiar estado del aviso');
        }
    };

    const handleDelete = async (id, titulo) => {
        if (!window.confirm(`¿Está seguro de eliminar el aviso "${titulo}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await api.delete(`/avisos/${id}`);
            setAvisos(prev => prev.filter(a => a.id !== id));
            toast.success('Aviso eliminado correctamente');
        } catch (error) {
            console.error('Error deleting aviso:', error);
            toast.error('Error al eliminar aviso');
        }
    };

    if (!isAdminDios) {
        return (
            <div className="avisos-container">
                <div className="empty-state-avisos">
                    <AlertCircle size={48} style={{ color: '#ef4444' }} />
                    <h2 style={{ color: '#0f172a', marginTop: 12 }}>Acceso Restringido</h2>
                    <p>Solo el Administrador (Dios) tiene privilegios para gestionar los avisos del sistema.</p>
                </div>
            </div>
        );
    }

    const today = new Date().toISOString().slice(0, 10);

    // KPI Metrics calculation
    const totalCount = avisos.length;
    const vigentesCount = avisos.filter(a => a.activo && a.fecha_desde <= today && a.fecha_hasta >= today).length;
    const paraTodosCount = avisos.filter(a => a.para_todos).length;
    const vencidosCount = avisos.filter(a => a.fecha_hasta < today || !a.activo).length;

    const getVigenciaBadge = (aviso) => {
        if (!aviso.activo) {
            return <span className="badge-vencido">Inactivo</span>;
        }
        if (aviso.fecha_hasta < today) {
            return <span className="badge-vencido">Vencido</span>;
        }
        if (aviso.fecha_desde > today) {
            return <span className="badge-programado">Programado</span>;
        }
        return <span className="badge-vigente">Vigente Hoy</span>;
    };

    const formatDateStr = (str) => {
        if (!str) return '-';
        try {
            const [y, m, d] = str.split('-');
            return `${d}/${m}/${y}`;
        } catch (e) {
            return str;
        }
    };

    const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const roleLabels = {
        admin: 'Admin Dios',
        oval: 'OVAL',
        administrador_contrato: 'Admin Contrato',
        contratista_admin: 'Admin EECC',
        contratista_user: 'Operativo EECC'
    };

    return (
        <div className="avisos-container">
            {/* Header */}
            <div className="avisos-header">
                <div className="avisos-header-title">
                    <h1>
                        <Megaphone size={28} style={{ color: '#003594' }} />
                        Gestión de Avisos del Sistema
                    </h1>
                    <p>
                        Configure y publique comunicados oficiales con formato embellecido y segmentación por roles.
                    </p>
                </div>
                <Link to="/avisos/new" className="avisos-create-btn">
                    <Plus size={18} /> Nuevo Aviso
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="avisos-kpi-grid">
                <div className="aviso-kpi-card">
                    <div className="aviso-kpi-icon" style={{ backgroundColor: '#eff6ff', color: '#003594' }}>
                        <Megaphone size={24} />
                    </div>
                    <div className="aviso-kpi-info">
                        <h3>{totalCount}</h3>
                        <p>Total de Avisos Registrados</p>
                    </div>
                </div>

                <div className="aviso-kpi-card">
                    <div className="aviso-kpi-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div className="aviso-kpi-info">
                        <h3>{vigentesCount}</h3>
                        <p>Avisos Vigentes Hoy</p>
                    </div>
                </div>

                <div className="aviso-kpi-card">
                    <div className="aviso-kpi-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                        <Users size={24} />
                    </div>
                    <div className="aviso-kpi-info">
                        <h3>{paraTodosCount}</h3>
                        <p>Visibles para Todos</p>
                    </div>
                </div>

                <div className="aviso-kpi-card">
                    <div className="aviso-kpi-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                        <Clock size={24} />
                    </div>
                    <div className="aviso-kpi-info">
                        <h3>{vencidosCount}</h3>
                        <p>Inactivos o Vencidos</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="avisos-filters-card">
                <div className="avisos-search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        className="avisos-search-input"
                        placeholder="Buscar aviso por título o contenido..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="avisos-filter-select"
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                >
                    <option value="todos">Todos los Estados</option>
                    <option value="vigente">Vigentes Actualmente</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                    <option value="vencido">Vencidos</option>
                </select>
            </div>

            {/* Table */}
            <div className="avisos-table-card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                        Cargando avisos...
                    </div>
                ) : avisos.length === 0 ? (
                    <div className="empty-state-avisos">
                        <Megaphone size={40} />
                        <h3>No se encontraron avisos</h3>
                        <p>Cree un nuevo comunicado oficial para mostrar a los usuarios al iniciar sesión.</p>
                        <Link to="/avisos/new" className="avisos-create-btn" style={{ marginTop: 12 }}>
                            <Plus size={16} /> Crear Primer Aviso
                        </Link>
                    </div>
                ) : (
                    <table className="avisos-table">
                        <thead>
                            <tr>
                                <th style={{ width: '30%' }}>Título del Aviso</th>
                                <th style={{ width: '20%' }}>Vigencia</th>
                                <th style={{ width: '22%' }}>Destinatarios</th>
                                <th style={{ width: '12%', textAlign: 'center' }}>Estado</th>
                                <th style={{ width: '16%', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {avisos.map((aviso) => (
                                <tr key={aviso.id}>
                                    <td>
                                        <div className="aviso-title-cell">
                                            <span className="aviso-cell-title">{aviso.titulo}</span>
                                            <span className="aviso-cell-snippet">{stripHtml(aviso.contenido)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                                                {formatDateStr(aviso.fecha_desde)} al {formatDateStr(aviso.fecha_hasta)}
                                            </span>
                                            <div>{getVigenciaBadge(aviso)}</div>
                                        </div>
                                    </td>
                                    <td>
                                        {aviso.para_todos ? (
                                            <span className="role-badge-all">Todos los usuarios</span>
                                        ) : Array.isArray(aviso.roles) && aviso.roles.length > 0 ? (
                                            <div>
                                                {aviso.roles.map(r => (
                                                    <span key={r} className="role-badge-tag">
                                                        {roleLabels[r] || r}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sin roles asignados</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className={`toggle-switch-btn ${aviso.activo ? 'active' : 'inactive'}`}
                                            onClick={() => handleToggleActivo(aviso)}
                                            title="Click para alternar estado"
                                        >
                                            {aviso.activo ? <Check size={12} /> : null}
                                            {aviso.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="aviso-actions-cell" style={{ justifyContent: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-icon-btn preview"
                                                onClick={() => setPreviewItem(aviso)}
                                                title="Vista previa del popup"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <Link
                                                to={`/avisos/${aviso.id}/edit`}
                                                className="action-icon-btn edit"
                                                title="Editar aviso"
                                            >
                                                <Edit size={16} />
                                            </Link>
                                            <button
                                                type="button"
                                                className="action-icon-btn delete"
                                                onClick={() => handleDelete(aviso.id, aviso.titulo)}
                                                title="Eliminar aviso"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Preview Modal */}
            {previewItem && (
                <AvisoPopupModal
                    forceOpen={true}
                    previewAviso={previewItem}
                    onClose={() => setPreviewItem(null)}
                />
            )}
        </div>
    );
}


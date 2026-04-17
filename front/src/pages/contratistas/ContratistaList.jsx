// IEEE Trace: REQ-009 | US-051 | pages/contratistas/ContratistaList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Building, Search, Plus, MapPin, Users, Edit, Trash2, RefreshCw, X, ChevronDown, ChevronUp, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SyncContratistasModal from '../../components/modals/SyncContratistasModal';
import VinculacionManager from '../../components/contratistas/VinculacionManager';
import AssociatedUsers from '../../components/contratistas/AssociatedUsers';
import { toast } from 'react-hot-toast';
import './ContratistaList.css';

export default function ContratistaList() {
    const [contratistas, setContratistas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState({}); // Track expanded rows
    const [potentialAdmins, setPotentialAdmins] = useState([]); // Users with role 'administrador_contrato'
    const [updatingAdmin, setUpdatingAdmin] = useState(null); // ID of contractor currently updating
    const [usersCAdmin, setUsersCAdmin] = useState([]);

    const { user, canWrite, canExec } = useAuth();
    const isADC = user?.role === 'administrador_contrato';

    // Filters State
    const [filters, setFilters] = useState({
        search: '',
        servicio: 'Todos',
        dependencia: 'Todas',
        estado: 'Todos',
        adminContrato: 'Todos'
    });

    useEffect(() => {
        fetchContratistas();
        fetchAdmins();
        fetchCAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const response = await api.get('/usuarios?role=administrador_contrato&active=true');
            setPotentialAdmins(response.data.data || []);
        } catch (err) {
            console.error('Error fetching admins', err);
        }
    };

    const fetchCAdmins = async () => {
        try {
            const res = await api.get('/usuarios?role=contratista_admin');
            setUsersCAdmin(res.data.data || []);
        } catch (err) {
            console.error("Error fetching CAdmins:", err);
        }
    };

    const fetchContratistas = async () => {
        try {
            const response = await api.get('/contratistas');
            setContratistas(response.data.data);
        } catch (err) {
            setError('Error al cargar contratistas');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, isCurrentlyActive) => {
        const action = isCurrentlyActive ? 'desactivar' : 'activar';
        if (!confirm(`¿Está seguro de ${action} este contratista?`)) return;
        try {
            await api.put(`/contratistas/${id}`, { activo: !isCurrentlyActive });
            toast.success(`Contratista ${isCurrentlyActive ? 'desactivado' : 'activado'} correctamente`);
            fetchContratistas();
        } catch (err) {
            toast.error('Error al cambiar estado del contratista');
        }
    };

    const handleCAdminAdd = async (contratistaId, userId) => {
        if (!userId) return;
        setUpdatingAdmin(contratistaId);
        try {
            await api.put(`/usuarios/${userId}`, { contratista_id: contratistaId });
            toast.success('Administrador asignado correctamente');
            fetchContratistas();
        } catch (err) {
            toast.error('Error al asignar administrador');
        } finally {
            setUpdatingAdmin(null);
        }
    };

    const handleCAdminRemove = async (userId) => {
        try {
            await api.put(`/usuarios/${userId}`, { contratista_id: null });
            toast.success('Administrador removido correctamente');
            fetchContratistas();
        } catch (err) {
            toast.error('Error al remover administrador');
        }
    };

    const handleDeletePermanent = async (id) => {
        if (!confirm('¿Está seguro de ELIMINAR permanentemente este contratista y todas sus vinculaciones?')) return;
        try {
            await api.delete(`/contratistas/${id}`);
            toast.success('Contratista eliminado permanentemente');
            fetchContratistas();
        } catch (err) {
            toast.error('Error al eliminar permanentemente');
        }
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Derive Filter Options
    const uniqueServicios = useMemo(() => {
        const services = new Set();
        contratistas.forEach(c => {
            c.vinculaciones?.forEach(v => {
                if (v.servicio?.nombre) services.add(v.servicio.nombre);
            });
        });
        return Array.from(services).sort();
    }, [contratistas]);

    const uniqueDependencias = useMemo(() => {
        const deps = new Set();
        contratistas.forEach(c => {
            c.vinculaciones?.forEach(v => {
                if (v.dependencia?.nombre) deps.add(v.dependencia.nombre);
            });
        });
        return Array.from(deps).sort();
    }, [contratistas]);

    // Computed Filtered Data
    const filteredContratistas = useMemo(() => {
        return contratistas.filter(c => {
            // Text Search
            const searchText = filters.search.toLowerCase();
            const matchesSearch = !searchText ||
                (c.nombre && c.nombre.toLowerCase().includes(searchText)) ||
                (c.rut && c.rut.toLowerCase().includes(searchText));

            // Status Filter
            const matchesStatus = filters.estado === 'Todos' ||
                (filters.estado === 'Activo' ? c.activo === 1 : c.activo === 0);

            // Service Filter
            const matchesService = filters.servicio === 'Todos' ||
                c.vinculaciones?.some(v => v.servicio?.nombre === filters.servicio);

            // Dependency Filter
            const matchesDependency = filters.dependencia === 'Todas' ||
                c.vinculaciones?.some(v => v.dependencia?.nombre === filters.dependencia);

            // Admin Contrato Filter
            const matchesAdmin = filters.adminContrato === 'Todos' ||
                c.vinculaciones?.some(v =>
                    v.administraciones?.some(a => a.administrador_contrato_id.toString() === filters.adminContrato)
                );

            return matchesSearch && matchesStatus && matchesService && matchesDependency && matchesAdmin;
        });
    }, [contratistas, filters]);

    // Helpers
    const getServiceNames = (vinculaciones) => {
        if (!vinculaciones?.length) return '-';
        return [...new Set(vinculaciones.map(v => v.servicio?.nombre).filter(Boolean))].join(', ');
    };

    const getDependencyNames = (vinculaciones) => {
        if (!vinculaciones?.length) return '-';
        return [...new Set(vinculaciones.map(v => v.dependencia?.nombre).filter(Boolean))].join(', ');
    };

    // Helper to get Admin names from vinculaciones -> administraciones
    const getAdminNames = (vinculaciones) => {
        if (!vinculaciones?.length) return 'Sin Asignar';
        const admins = new Set();
        vinculaciones.forEach(v => {
            v.administraciones?.forEach(a => {
                if (a.administradorContrato?.name) admins.add(a.administradorContrato.name);
            });
        });
        const adminList = Array.from(admins);
        if (adminList.length === 0) return 'Sin Asignar';
        return adminList.join(', ');
    };

    // Updated helper to get admin objects for tags
    const getAdminObjects = (vinculaciones) => {
        if (!vinculaciones?.length) return [];
        const adminsMap = new Map();
        vinculaciones.forEach(v => {
            v.administraciones?.forEach(a => {
                if (a.administradorContrato?.id && a.activo) {
                    adminsMap.set(a.administradorContrato.id, {
                        id: a.administradorContrato.id,
                        name: a.administradorContrato.name
                    });
                }
            });
        });
        return Array.from(adminsMap.values());
    };

    // Helper to calculate aggregate dates
    const getContractDates = (vinculaciones) => {
        if (!vinculaciones?.length) return { start: '-', end: '-' };

        // Parse start dates
        const startDates = vinculaciones
            .map(v => v.fecha_inicio_contrato)
            .filter(Boolean)
            .map(d => new Date(d).getTime());

        // Parse end dates (keep nulls as they mean indefinite)
        const endDates = vinculaciones
            .map(v => v.fecha_termino_contrato);

        let minStart = '-';
        if (startDates.length > 0) {
            // Find min start date
            minStart = new Date(Math.min(...startDates)).toLocaleDateString('es-CL', { timeZone: 'UTC' });
        }

        let maxEnd = '-';
        const hasIndefinite = endDates.some(d => d === null);

        if (hasIndefinite) {
            maxEnd = 'Indefinido';
        } else {
            const validEndDates = endDates
                .filter(Boolean)
                .map(d => new Date(d).getTime());

            if (validEndDates.length > 0) {
                // Find max end date
                maxEnd = new Date(Math.max(...validEndDates)).toLocaleDateString('es-CL', { timeZone: 'UTC' });
            }
        }

        return { start: minStart, end: maxEnd };
    };

    const handleAdminChange = async (contratistaId, adminId) => {
        if (!adminId) return;
        setUpdatingAdmin(contratistaId);
        try {
            await api.post(`/contratistas/${contratistaId}/admin`, { administrador_contrato_id: adminId });
            toast.success('Administrador agregado correctamente');
            fetchContratistas();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al agregar administrador');
        } finally {
            setUpdatingAdmin(null);
        }
    };

    const handleAdminRemove = async (contratistaId, adminId) => {
        setUpdatingAdmin(contratistaId);
        try {
            await api.delete(`/contratistas/${contratistaId}/admin/${adminId}`);
            toast.success('Administrador removido correctamente');
            fetchContratistas();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al remover administrador');
        } finally {
            setUpdatingAdmin(null);
        }
    };

    if (loading) return <div className="loading">Cargando contratistas...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">
                        <Users size={28} className="text-primary" />
                        Gestión de Contratistas
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                        Empresas externas, servicios y vinculaciones activas.
                    </p>
                </div>
                {canWrite('Configuración') && !isADC && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsSyncModalOpen(true)}
                            id="btn-sync-contractors"
                            className="btn-secondary flex items-center gap-2"
                        >
                            <RefreshCw size={18} /> Sincronizar
                        </button>
                        <Link to="/contratistas/new" id="btn-new-contractor" className="btn-primary flex items-center gap-2" style={{ textDecoration: 'none' }}>
                            <Plus size={18} /> Nuevo Contratista
                        </Link>
                    </div>
                )}
            </header>

            {/* Filters Bar */}
            <div className="filters-bar">
                <div className="filter-group" style={{ flex: '1 1 250px' }}>
                    <label className="filter-label">Buscar</label>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Buscar por Nombre, RUT, Servicio, Dependencia..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        style={{ paddingLeft: '32px' }}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-10%)', color: '#94a3b8' }} />
                </div>

                <div className="filter-group">
                    <label className="filter-label">Servicio</label>
                    <select
                        className="filter-input"
                        value={filters.servicio}
                        onChange={e => setFilters({ ...filters, servicio: e.target.value })}
                    >
                        <option value="Todos">Todos</option>
                        {uniqueServicios.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Dependencia</label>
                    <select
                        className="filter-input"
                        value={filters.dependencia}
                        onChange={e => setFilters({ ...filters, dependencia: e.target.value })}
                    >
                        <option value="Todas">Todas</option>
                        {uniqueDependencias.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Admin Contrato</label>
                    <select
                        className="filter-input"
                        value={filters.adminContrato}
                        onChange={e => setFilters({ ...filters, adminContrato: e.target.value })}
                    >
                        <option value="Todos">Todos</option>
                        {potentialAdmins.map(admin => (
                            <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Estado</label>
                    <select
                        className="filter-input"
                        value={filters.estado}
                        onChange={e => setFilters({ ...filters, estado: e.target.value })}
                    >
                        <option value="Todos">Todos</option>
                        <option value="Activo">Activos</option>
                        <option value="Inactivo">Inactivos</option>
                    </select>
                </div>

                <button
                    className="btn-primary"
                    title="Filtrar"
                >
                    <Search size={18} /> Filtrar
                </button>
                <button
                    className="btn-secondary"
                    onClick={() => setFilters({ search: '', servicio: 'Todos', dependencia: 'Todas', estado: 'Todos', adminContrato: 'Todos' })}
                    title="Limpiar"
                >
                    Limpiar
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* List Header */}
            <div className="table-header">
                <div>CONTRATISTA (RAZÓN SOCIAL)</div>
                <div>RUT</div>
                <div>SERVICIO</div>
                <div>DEPENDENCIA</div>
                <div>CONTRATISTA ADMIN</div>
                <div>INICIO CONT.</div>
                <div>TÉRMINO CONT.</div>
                <div style={{ textAlign: 'right' }}>ACCIONES</div>
            </div>

            {/* Data List */}
            <div className="contratista-list">
                {filteredContratistas.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        No se encontraron registros coincidentes.
                    </div>
                ) : (
                    filteredContratistas.map((c) => {
                        const { start: startDate, end: endDate } = getContractDates(c.vinculaciones);
                        return (
                            <div
                                key={c.id}
                                className={`contratista-card ${expandedRows[c.id] ? 'expanded' : ''}`}
                            >
                                {/* Main Row */}
                                <div className="contratista-main-row">
                                    <div>
                                        <div className="contratista-name">
                                            {c.nombre}
                                            <span className={`badge ${c.activo ? 'badge-active' : ''}`}>
                                                {c.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                        <div className="contratista-email">
                                            {c.email_contacto || 'Sin email'}
                                        </div>
                                    </div>
                                    <div className="rut-text">
                                        {c.rut || '-'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        {getServiceNames(c.vinculaciones)}
                                    </div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        {getDependencyNames(c.vinculaciones)}
                                    </div>
                                    <div className="admin-tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {(c.usuarios || []).filter(u => u.role === 'contratista_admin').map(admin => (
                                            <div key={admin.id} className="admin-tag" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                backgroundColor: '#E0F2FE',
                                                color: '#0369A1',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '500',
                                                border: '1px solid #BAE6FD'
                                            }}>
                                                {admin.name}
                                                {canWrite('Configuración') && !isADC && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCAdminRemove(admin.id); }}
                                                        style={{
                                                            marginLeft: '4px',
                                                            border: 'none',
                                                            background: 'none',
                                                            color: '#0369A1',
                                                            cursor: 'pointer',
                                                            fontSize: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '0 2px'
                                                        }}
                                                        title="Remover"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {canWrite('Configuración') && !isADC && (
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <select
                                                    className="add-admin-select"
                                                    value=""
                                                    onChange={(e) => handleCAdminAdd(c.id, e.target.value)}
                                                    disabled={updatingAdmin === c.id}
                                                    style={{
                                                        padding: '2px 4px',
                                                        borderRadius: '4px',
                                                        border: '1px dashed #CBD5E1',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: 'transparent',
                                                        color: '#64748B',
                                                        cursor: 'pointer',
                                                        maxWidth: '80px'
                                                    }}
                                                >
                                                    <option value="">+ Añadir</option>
                                                    {usersCAdmin
                                                        .filter(u => u.contratista_id !== c.id)
                                                        .map(u => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                </select>
                                            </div>
                                        )}
                                        {((c.usuarios || []).filter(u => u.role === 'contratista_admin').length === 0) && !canWrite('Configuración') && (
                                            <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.75rem' }}>Sin asignar</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                        {startDate}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                        {endDate}
                                    </div>
                                    <div className="actions-cell" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                            onClick={() => toggleRow(c.id)}
                                            className="action-btn"
                                            title={expandedRows[c.id] ? "Ocultar Vinculaciones" : "Ver Vinculaciones"}
                                        >
                                            {expandedRows[c.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>

                                        {canWrite('Configuración') && !isADC && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(c.id, c.activo); }}
                                                    className="action-btn"
                                                    style={{ color: c.activo ? '#10B981' : '#F59E0B' }}
                                                    title={c.activo ? "Desactivar" : "Activar"}
                                                >
                                                    <Power size={18} />
                                                </button>
                                                <Link to={`/contratistas/${c.id}`} className="action-btn" title="Editar">
                                                    <Edit size={18} />
                                                </Link>
                                                {canExec('Configuración') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeletePermanent(c.id); }}
                                                        className="action-btn danger"
                                                        title="Eliminar permanentemente"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                 {/* Expanded Section */}
                                {expandedRows[c.id] && (
                                    <div className="assignments-section" style={{ backgroundColor: '#fcfcfd', borderBottom: '1px solid #edf2f7', padding: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                                            <div>
                                                <VinculacionManager contratista={c} onUpdate={fetchContratistas} />
                                            </div>
                                            <div style={{ borderLeft: '1px solid #edf2f7', paddingLeft: '24px' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#1e293b', marginBottom: '16px' }}>
                                                    <Users size={16} /> Usuarios Asociados
                                                </h4>
                                                <AssociatedUsers contratistaId={c.id} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right', color: '#6b7280', fontSize: '0.85rem' }}>
                Mostrando {filteredContratistas.length} de {contratistas.length} empresas
            </div>

            <SyncContratistasModal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                onSyncComplete={fetchContratistas}
            />
        </div>
    );
}

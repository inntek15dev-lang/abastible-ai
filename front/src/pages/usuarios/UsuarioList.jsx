import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Search, RefreshCw, X, Trash2 } from 'lucide-react';
import Toggle from '../../components/ui/Toggle';
import './UsuarioList.css';

export default function UsuarioList() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        role: 'Todos',
        status: 'Todos'
    });
    const [activeFilters, setActiveFilters] = useState({
        search: '',
        role: 'Todos',
        status: 'Todos'
    });
    const { canWrite, canExec, canRead } = useAuth();

    if (!canRead('Usuarios')) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                <h2>Acceso Denegado</h2>
                <p>No tiene permiso para visualizar este módulo.</p>
            </div>
        );
    }

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            const response = await api.get('/usuarios');
            setUsuarios(response.data.data);
        } catch (err) {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            await api.put(`/usuarios/${id}`, { activo: !currentStatus });
            fetchUsuarios();
        } catch (err) {
            setError('Error al actualizar usuario');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este usuario?')) return;
        try {
            await api.delete(`/usuarios/${id}`);
            fetchUsuarios();
        } catch (err) {
            setError('Error al eliminar usuario');
        }
    };

    const getRoleBadge = (role) => {
        const colors = {
            oval: 'danger', // Special color for superadmin
            admin: 'primary',
            administrador_contrato: 'info',
            contratista_admin: 'warning',
            contratista_user: 'secondary'
        };
        return colors[role] || 'default';
    };

    const handleApplyFilters = () => {
        setActiveFilters({ ...filters });
    };

    const handleClearFilters = () => {
        const reset = {
            search: '',
            role: 'Todos',
            status: 'Todos'
        };
        setFilters(reset);
        setActiveFilters(reset);
    };

    const filteredUsuarios = usuarios.filter(u => {
        const matchStatus = activeFilters.status === 'Todos' || 
            (activeFilters.status === 'Activo' && (u.activo === 1 || u.activo === true)) ||
            (activeFilters.status === 'Inactivo' && (u.activo === 0 || u.activo === false));
        
        const matchRole = activeFilters.role === 'Todos' || u.role === activeFilters.role;
        
        const matchSearch = !activeFilters.search || 
            u.name.toLowerCase().includes(activeFilters.search.toLowerCase()) ||
            u.email.toLowerCase().includes(activeFilters.search.toLowerCase());

        return matchStatus && matchRole && matchSearch;
    });

    const { user } = useAuth();
    const uniqueRoles = user?.role === 'oval' 
        ? ['oval', 'admin', 'administrador_contrato', 'contratista_admin', 'contratista_user']
        : ['admin', 'administrador_contrato', 'contratista_admin', 'contratista_user'];

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Gestión de Usuarios</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                        Administra usuarios, roles y accesos del sistema.
                    </p>
                </div>
                {canWrite('Usuarios') && (
                    <Link to="/usuarios/new" className="btn-primary">
                        <Plus size={18} /> Nuevo Usuario
                    </Link>
                )}
            </header>

            <div className="filters-bar">
                <div className="filter-group" style={{ flex: '1 1 250px' }}>
                    <label className="filter-label">Nombre / Email</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            list="user-search-list"
                            type="text"
                            className="filter-input"
                            placeholder="Buscar por nombre o email..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            style={{ paddingLeft: '32px', width: '100%' }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <datalist id="user-search-list">
                            {usuarios.map(u => <option key={u.id} value={u.name} />)}
                        </datalist>
                    </div>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Rol</label>
                    <select
                        className={`filter-input role-select ${filters.role !== 'Todos' ? `role-select-${filters.role}` : ''}`}
                        value={filters.role}
                        onChange={e => setFilters({ ...filters, role: e.target.value })}
                    >
                        <option value="Todos">TODOS LOS ROLES</option>
                        {uniqueRoles.map(role => (
                            <option key={role} value={role}>{role.replace(/_/g, ' ').toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Estado</label>
                    <select
                        className="filter-input"
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="Todos">TODOS</option>
                        <option value="Activo">ACTIVOS</option>
                        <option value="Inactivo">INACTIVOS</option>
                    </select>
                </div>

                <div className="filter-actions">
                    <button className="btn-filter" onClick={handleApplyFilters}>
                        <Search size={16} /> Filtrar
                    </button>
                    <button className="btn-clear" onClick={handleClearFilters}>
                        Limpiar
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>USU_ID</th>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>RUT</th>
                            <th>Rol</th>
                            <th>Empresa</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsuarios.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="empty-row">No hay usuarios que coincidan con el filtro</td>
                            </tr>
                        ) : (
                            filteredUsuarios.map((usuario) => {
                                const userId = usuario.usu_id || usuario.id;
                                const currentUserId = useAuth().user?.usu_id || useAuth().user?.id;
                                const isSelf = String(userId) === String(currentUserId);
                                return (
                                    <tr key={userId}>
                                        <td>{usuario.name}</td>
                                        <td>{usuario.usu_id ?? '-'}</td>
                                        <td>{usuario.usuario || '-'}</td>
                                        <td>{usuario.email}</td>
                                        <td>{usuario.rut || '-'}</td>
                                        <td>
                                            <span className={`badge ${getRoleBadge(usuario.role)}`}>
                                                {usuario.role.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>{usuario.eecc_nombre || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Toggle
                                                    checked={Boolean(usuario.activo)}
                                                    onChange={() => toggleActive(userId, usuario.activo)}
                                                    disabled={!canExec('Usuarios') || isSelf}
                                                    title={isSelf ? "No puede desactivar su propia cuenta" : ""}
                                                />
                                                <span style={{ fontSize: '0.85rem', color: usuario.activo ? 'var(--success)' : 'var(--text-secondary)' }}>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="actions-cell">
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {canWrite('Usuarios') && (
                                                    <Link to={`/usuarios/${userId}/edit`} className="btn-icon" title="Editar">
                                                        <Edit size={18} />
                                                    </Link>
                                                )}
                                                {canWrite('Usuarios') && !isSelf && (
                                                    <button 
                                                        className="btn-icon text-red-500" 
                                                        onClick={() => handleDelete(userId)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// IEEE Trace: REQ-007 | US-006 | pages/usuarios/UsuarioList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, UserX, UserCheck } from 'lucide-react';
import Toggle from '../../components/ui/Toggle';

export default function UsuarioList() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec } = useAuth();

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

    const getRoleBadge = (role) => {
        const colors = {
            admin: 'primary',
            administrador_contrato: 'info',
            contratista_admin: 'warning',
            contratista_user: 'secondary'
        };
        return colors[role] || 'default';
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Usuarios</h1>
                {canWrite('Usuarios') && (
                    <Link to="/usuarios/new" className="btn-primary">
                        <Plus size={18} /> Nuevo Usuario
                    </Link>
                )}
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Empresa</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-row">No hay usuarios</td>
                            </tr>
                        ) : (
                            usuarios.map((usuario) => (
                                <tr key={usuario.id}>
                                    <td>{usuario.name}</td>
                                    <td>{usuario.email}</td>
                                    <td>
                                        <span className={`badge ${getRoleBadge(usuario.role)}`}>
                                            {usuario.role}
                                        </span>
                                    </td>
                                    <td>{usuario.eecc_nombre || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Toggle
                                                checked={Boolean(usuario.activo)}
                                                onChange={() => toggleActive(usuario.id, usuario.activo)}
                                                disabled={!canExec('Usuarios')}
                                            />
                                            <span style={{ fontSize: '0.85rem', color: usuario.activo ? 'var(--success)' : 'var(--text-secondary)' }}>
                                                {usuario.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="actions-cell">
                                        {canWrite('Usuarios') && (
                                            <Link to={`/usuarios/${usuario.id}/edit`} className="btn-icon" title="Editar">
                                                <Edit size={18} />
                                            </Link>
                                        )}
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

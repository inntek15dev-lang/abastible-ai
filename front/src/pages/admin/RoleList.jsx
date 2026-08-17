// IEEE Trace: Sprint 7 | Role Management UI
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Shield, Plus, Edit2, Trash2, Settings, Users } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function RoleList() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { canWrite, canExec, canRead } = useAuth();

    if (!canRead('Admin_Usuarios')) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                <h2>Acceso Denegado</h2>
                <p>No tiene permiso para visualizar este módulo.</p>
            </div>
        );
    }

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [formData, setFormData] = useState({ name: '' });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/roles');
            setRoles(response.data.data);
        } catch (err) {
            setError('Error al cargar roles');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, formData);
            } else {
                await api.post('/roles', formData);
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (err) {
            alert('Error al guardar rol');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Está seguro de eliminar este rol?')) return;
        try {
            await api.delete(`/roles/${id}`);
            fetchRoles();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al eliminar rol');
        }
    };

    const openModal = (role = null) => {
        setEditingRole(role);
        setFormData({ name: role ? role.name : '' });
        setIsModalOpen(true);
    };

    if (loading) return <div className="loading">Cargando roles...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>
                    <Shield size={24} style={{ marginRight: 10 }} />
                    Gestión de Roles
                </h1>
                {canWrite('Admin_Usuarios') && (
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={16} /> Nuevo Rol
                    </button>
                )}
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre del Rol</th>
                            <th>Identificador Sistema</th>
                            <th>Usuarios</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => (
                            <tr key={role.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="logo-circle" style={{ width: 24, height: 24, fontSize: 10 }}>
                                            {role.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <strong>{role.name.replace(/_/g, ' ').toUpperCase()}</strong>
                                    </div>
                                </td>
                                <td style={{ fontFamily: 'monospace', color: '#666' }}>{role.name}</td>
                                <td>
                                    <span className="badge secondary">TBD</span>
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button
                                            className="btn-icon"
                                            title="Matriz de Privilegios"
                                            onClick={() => navigate(`/roles/${role.id}/privileges`)}
                                        >
                                            <Settings size={18} />
                                        </button>

                                        {canWrite('Admin_Usuarios') && (
                                            <button
                                                className="btn-icon"
                                                onClick={() => openModal(role)}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        )}

                                        {canExec('Admin_Usuarios') && (
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => handleDelete(role.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRole ? 'Editar Rol' : 'Nuevo Rol'}
            >
                <div className="form-group">
                    <label>Nombre del Rol (Sistema)</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="ej: supervisor_planta"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={editingRole && ['admin', 'administrador_contrato'].includes(editingRole.name)}
                    />
                    <small style={{ display: 'block', marginTop: 5, color: '#666' }}>
                        Use minúsculas y guiones bajos (snake_case).
                    </small>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSave}>Guardar</button>
                </div>
            </Modal>
        </div>
    );
}

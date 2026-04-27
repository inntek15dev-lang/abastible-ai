import { useState, useEffect } from 'react';
import api from '../../api';
import { Trash2, Plus, Save, X, Building, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function VinculacionManager({ contratista, onUpdate }) {
    const { user } = useAuth();
    const isADC = user?.role === 'administrador_contrato';
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [servicios, setServicios] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [usersAdmin, setUsersAdmin] = useState([]);
    const [usersCUser, setUsersCUser] = useState([]);

    // Form State
    const [newVinc, setNewVinc] = useState({
        servicio_id: '',
        dependencia_id: '',
        fecha_inicio_contrato: '',
        fecha_termino_contrato: '',
        administrador_contrato_id: '',
        numero_contrato: ''
    });

    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        loadResources();
    }, []);

    const loadResources = async () => {
        try {
            const [servRes, depRes, adminRes, cUserRes] = await Promise.all([
                api.get('/resources/tipos-contratista'),
                api.get('/resources/dependencias'),
                api.get('/usuarios?role=administrador_contrato&active=true'),
                api.get(`/usuarios?role=contratista_user&contratista_id=${contratista.id}&active=true`)
            ]);
            setServicios(servRes.data.data || []);
            setDependencias(depRes.data.data || []);
            setUsersAdmin(adminRes.data.data || []);
            setUsersCUser(cUserRes.data.data || []);
        } catch (error) {
            console.error('Error loading resources', error);
        }
    };

    const handleSave = async () => {
        if (!newVinc.servicio_id || !newVinc.dependencia_id) {
            toast.error('Seleccione Servicio y Dependencia');
            return;
        }

        try {
            await api.post('/vinculaciones', {
                contratista_id: contratista.id,
                servicio_id: newVinc.servicio_id,
                dependencia_id: newVinc.dependencia_id,
                fecha_inicio_contrato: newVinc.fecha_inicio_contrato || null,
                fecha_termino_contrato: newVinc.fecha_termino_contrato || null,
                administrador_contrato_id: newVinc.administrador_contrato_id || null,
                numero_contrato: newVinc.numero_contrato || null,
                activo: 1
            });
            toast.success('Vinculación agregada');
            setIsAdding(false);
            setNewVinc({ servicio_id: '', dependencia_id: '', fecha_inicio_contrato: '', fecha_termino_contrato: '', administrador_contrato_id: '', numero_contrato: '' });
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar vinculación');
        }
    };

    const handleEdit = (v) => {
        setEditingId(v.id);
        setEditForm({
            servicio_id: v.servicio_id,
            dependencia_id: v.dependencia_id,
            numero_contrato: v.numero_contrato || '',
            fecha_inicio_contrato: v.fecha_inicio_contrato ? v.fecha_inicio_contrato.substring(0, 10) : '',
            fecha_termino_contrato: v.fecha_termino_contrato ? v.fecha_termino_contrato.substring(0, 10) : ''
        });
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/vinculaciones/${editingId}`, editForm);
            toast.success('Vinculación actualizada');
            setEditingId(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta vinculación?')) return;
        try {
            await api.delete(`/vinculaciones/${id}`);
            toast.success('Vinculación eliminada');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleAdminAdd = async (vinculacionId, adminId) => {
        if (!adminId) return;
        try {
            await api.post(`/vinculaciones/${vinculacionId}/admin`, { administrador_contrato_id: adminId });
            toast.success('Administrador agregado');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al agregar administrador');
        }
    };

    const handleAdminRemove = async (vinculacionId, adminId) => {
        try {
            await api.delete(`/vinculaciones/${vinculacionId}/admin/${adminId}`);
            toast.success('Administrador removido');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al remover administrador');
        }
    };

    const handleUserAdd = async (vinculacionId, userId) => {
        if (!userId) return;
        try {
            await api.post(`/vinculaciones/${vinculacionId}/usuarios`, { user_id: userId });
            toast.success('Usuario asignado');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al asignar usuario');
        }
    };

    const handleUserRemove = async (vinculacionId, userId) => {
        try {
            await api.delete(`/vinculaciones/${vinculacionId}/usuarios/${userId}`);
            toast.success('Asignación removida');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Error al remover asignación');
        }
    };

    const gridLayout = "minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 1.5fr 1.5fr 100px 100px 100px 80px";

    return (
        <div className="vinculacion-manager">
            <h4 className="vinculacion-title">
                <Building size={16} /> Vinculaciones y Asignaciones
            </h4>

            {/* List Existing */}
            <div className="vinc-list">
                {/* Header Row */}
                <div className="vinc-list-header" style={{ gridTemplateColumns: gridLayout }}>
                    <div>GERENCIA</div>
                    <div>SUBGERENCIA</div>
                    <div>SERVICIO</div>
                    <div>DEPENDENCIA</div>
                    <div>ADMIN CONTRATO</div>
                    <div>CONTRATISTAS USUARIOS</div>
                    <div>N° CONTRATO</div>
                    <div>INICIO</div>
                    <div>TÉRMINO</div>
                    <div>ACCIONES</div>
                </div>

                {contratista.vinculaciones && contratista.vinculaciones.length > 0 ? (
                    contratista.vinculaciones.map(v => (
                        <div key={v.id} className="vinc-item" style={{ gridTemplateColumns: gridLayout }}>
                            {editingId === v.id ? (
                                <>
                                    <div>-</div>
                                    <div>-</div>
                                    <div>
                                        <select
                                            className="add-vinc-admin-select"
                                            value={editForm.servicio_id}
                                            onChange={e => setEditForm({ ...editForm, servicio_id: e.target.value })}
                                            style={{ width: '100%' }}
                                        >
                                            {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            className="add-vinc-admin-select"
                                            value={editForm.dependencia_id}
                                            onChange={e => setEditForm({ ...editForm, dependencia_id: e.target.value })}
                                            style={{ width: '100%' }}
                                        >
                                            {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div>
                                        <input
                                            type="text"
                                            className="add-vinc-admin-select"
                                            value={editForm.numero_contrato}
                                            onChange={e => setEditForm({ ...editForm, numero_contrato: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="date"
                                            className="add-vinc-admin-select"
                                            value={editForm.fecha_inicio_contrato}
                                            onChange={e => setEditForm({ ...editForm, fecha_inicio_contrato: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="date"
                                            className="add-vinc-admin-select"
                                            value={editForm.fecha_termino_contrato}
                                            onChange={e => setEditForm({ ...editForm, fecha_termino_contrato: e.target.value })}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                                        <button onClick={handleUpdate} className="action-btn success" title="Guardar">
                                            <Save size={16} />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="action-btn danger" title="Cancelar">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <span className="badge-service" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8' }}>{v.gerencia?.nombre}</span>
                                    </div>
                                    <div>
                                        <span className="badge-service" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>{v.subgerencia?.nombre}</span>
                                    </div>
                                    <div>
                                        <span className="badge-service">{v.servicio?.nombre}</span>
                                    </div>
                                    <div>{v.dependencia?.nombre}</div>
                                    
                                    {/* ADMIN CONTRATO */}
                                    <div className="admin-tags-cell">
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {v.administraciones && v.administraciones.length > 0 ? (
                                                v.administraciones.map(a => (
                                                    <div key={a.id} className="admin-tag-small" title={a.administradorContrato?.email}>
                                                        {a.administradorContrato?.name}
                                                        {!isADC && user?.role !== 'admin' && (
                                                            <button onClick={() => handleAdminRemove(v.id, a.administrador_contrato_id)}>
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Sin Asignar</span>
                                            )}
                                            {!isADC && user?.role !== 'admin' && (
                                                <select
                                                    className="add-vinc-admin-select"
                                                    value=""
                                                    onChange={(e) => handleAdminAdd(v.id, e.target.value)}
                                                >
                                                    <option value="">+ Añadir</option>
                                                    {usersAdmin
                                                        .filter(u => !(v.administraciones || []).some(a => a.administrador_contrato_id === u.id))
                                                        .map(u => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <div></div>

                                    {/* CONTRATISTAS USUARIOS - Vinculacion Specific */}
                                    <div className="admin-tags-cell">
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {v.usuariosVinculados && v.usuariosVinculados.filter(uv => uv.usuario?.role === 'contratista_user').length > 0 ? (
                                                v.usuariosVinculados.filter(uv => uv.usuario?.role === 'contratista_user').map(uv => (
                                                    <div key={uv.id} className="admin-tag-small" style={{ backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }} title={uv.usuario?.email}>
                                                        {uv.usuario?.name}
                                                        {!isADC && user?.role !== 'admin' && (
                                                            <button onClick={() => handleUserRemove(v.id, uv.user_id)}>
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Sin Asignar</span>
                                            )}
                                            {!isADC && user?.role !== 'admin' && (
                                                <select
                                                    className="add-vinc-admin-select"
                                                    value=""
                                                    onChange={(e) => handleUserAdd(v.id, e.target.value)}
                                                >
                                                    <option value="">+ Añadir</option>
                                                    {usersCUser
                                                        .filter(u => !(v.usuariosVinculados || []).some(uv => uv.user_id === u.id))
                                                        .map(u => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                    <div>{v.numero_contrato || '-'}</div>
                                    <div style={{ color: 'var(--color-text-secondary)' }}>
                                        {v.fecha_inicio_contrato ? new Date(v.fecha_inicio_contrato).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '-'}
                                    </div>
                                    <div style={{ color: 'var(--color-text-secondary)' }}>
                                        {v.fecha_termino_contrato ? new Date(v.fecha_termino_contrato).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : 'Indefinido'}
                                    </div>
                                    <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                                        {!isADC && user?.role !== 'admin' && (
                                            <>
                                                <button onClick={() => handleEdit(v)} className="action-btn" title="Editar">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(v.id)} className="action-btn danger" title="Desvincular">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '8px', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                        Sin vinculaciones activas.
                    </div>
                )}
            </div>

            {/* Add New Section */}
            {isAdding ? (
                <div className="add-vinc-form" style={{ gridTemplateColumns: 'minmax(100px, 1fr) minmax(100px, 1fr) 1.5fr 1fr 1fr 1fr auto' }}>
                    <div style={{ color: 'var(--color-text-light)', fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>Automático</div>
                    <div style={{ color: 'var(--color-text-light)', fontSize: '0.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>Automático</div>
                    <select
                        className="filter-input"
                        value={newVinc.servicio_id}
                        onChange={e => setNewVinc({ ...newVinc, servicio_id: e.target.value })}
                        style={{ width: '100%' }}
                    >
                        <option value="">Servicio...</option>
                        {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>

                    <select
                        className="filter-input"
                        value={newVinc.dependencia_id}
                        onChange={e => setNewVinc({ ...newVinc, dependencia_id: e.target.value })}
                        style={{ width: '100%' }}
                    >
                        <option value="">Dependencia...</option>
                        {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>

                    <select
                        className="filter-input"
                        value={newVinc.administrador_contrato_id}
                        onChange={e => setNewVinc({ ...newVinc, administrador_contrato_id: e.target.value })}
                        style={{ width: '100%' }}
                    >
                        <option value="">Admin...</option>
                        {usersAdmin.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>

                    <input
                        type="text"
                        className="filter-input"
                        placeholder="N° Contrato"
                        value={newVinc.numero_contrato}
                        onChange={e => setNewVinc({ ...newVinc, numero_contrato: e.target.value })}
                        style={{ width: '100%' }}
                    />

                    <input
                        type="date"
                        className="filter-input"
                        value={newVinc.fecha_inicio_contrato}
                        onChange={e => setNewVinc({ ...newVinc, fecha_inicio_contrato: e.target.value })}
                        style={{ width: '100%' }}
                    />

                    <input
                        type="date"
                        className="filter-input"
                        value={newVinc.fecha_termino_contrato}
                        onChange={e => setNewVinc({ ...newVinc, fecha_termino_contrato: e.target.value })}
                        style={{ width: '100%' }}
                    />

                    <div className="flex gap-2">
                        <button onClick={handleSave} className="btn-primary" style={{ padding: '0 12px' }} title="Guardar">
                            <Save size={16} />
                        </button>
                        <button onClick={() => setIsAdding(false)} className="btn-secondary" style={{ padding: '0 12px' }} title="Cancelar">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : (!isADC && user?.role !== 'admin') ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-text"
                    style={{
                        marginTop: '12px',
                        color: 'var(--color-primary)',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={16} /> Nueva Asignación
                </button>
            ) : null}
        </div>
    );
}

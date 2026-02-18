import { useState, useEffect } from 'react';
import api from '../../api';
import { Trash2, Plus, Save, X, Building, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function VinculacionManager({ contratista, onUpdate }) {
    const [isAdding, setIsAdding] = useState(false);
    const [servicios, setServicios] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [users, setUsers] = useState([]);

    // Form State
    const [newVinc, setNewVinc] = useState({
        servicio_id: '',
        dependencia_id: '',
        fecha_inicio_contrato: '',
        fecha_termino_contrato: '',
        administrador_contrato_id: '',
        numero_contrato: ''
    });

    useEffect(() => {
        loadResources();
    }, []);

    const loadResources = async () => {
        try {
            const [servRes, depRes, userRes] = await Promise.all([
                api.get('/resources/tipos-contratista'),
                api.get('/resources/dependencias'),
                api.get('/usuarios?role=administrador_contrato&active=true') // Fetch potential admins
            ]);
            setServicios(servRes.data.data || []);
            setDependencias(depRes.data.data || []);
            setUsers(userRes.data.data || []);
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

    return (
        <div className="vinculacion-manager">
            <h4 className="vinculacion-title">
                <Building size={16} /> Vinculaciones y Asignaciones
            </h4>

            {/* List Existing */}
            <div className="vinc-list">
                {/* Header Row */}
                <div className="vinc-list-header" style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1fr 40px' }}>
                    <div>SERVICIO</div>
                    <div>DEPENDENCIA</div>
                    <div>ADMIN CONTRATO</div>
                    <div>N° CONTRATO</div>
                    <div>INICIO</div>
                    <div>TÉRMINO</div>
                    <div></div>
                </div>

                {contratista.vinculaciones && contratista.vinculaciones.length > 0 ? (
                    contratista.vinculaciones.map(v => (
                        <div key={v.id} className="vinc-item" style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1fr 40px' }}>
                            <div>
                                <span className="badge-service">{v.servicio?.nombre}</span>
                            </div>
                            <div>{v.dependencia?.nombre}</div>
                            <div className="admin-tags-cell">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {v.administraciones && v.administraciones.length > 0 ? (
                                        v.administraciones.map(a => (
                                            <div key={a.id} className="admin-tag-small" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                backgroundColor: '#F3F4F6',
                                                padding: '2px 4px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                border: '1px solid #E5E7EB'
                                            }}>
                                                {a.administradorContrato?.name}
                                                <button
                                                    onClick={() => handleAdminRemove(v.id, a.administrador_contrato_id)}
                                                    style={{ border: 'none', background: 'none', marginLeft: '4px', cursor: 'pointer', color: '#9CA3AF' }}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Sin Asignar</span>
                                    )}
                                    <select
                                        className="add-vinc-admin-select"
                                        value=""
                                        onChange={(e) => handleAdminAdd(v.id, e.target.value)}
                                        style={{
                                            border: '1px dashed #CBD5E1',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            padding: '0 2px',
                                            background: 'transparent',
                                            color: '#64748B'
                                        }}
                                    >
                                        <option value="">+ Añadir</option>
                                        {users
                                            .filter(u => !(v.administraciones || []).some(a => a.administrador_contrato_id === u.id))
                                            .map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                            <div>{v.numero_contrato || '-'}</div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>
                                {v.fecha_inicio_contrato ? new Date(v.fecha_inicio_contrato).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '-'}
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>
                                {v.fecha_termino_contrato ? new Date(v.fecha_termino_contrato).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : 'Indefinido'}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <button onClick={() => handleDelete(v.id)} className="action-btn danger" title="Desvincular">
                                    <Trash2 size={16} />
                                </button>
                            </div>
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
                <div className="add-vinc-form" style={{ gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1fr auto' }}>
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
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
            ) : (
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
            )}
        </div>
    );
}

// IEEE Trace: REQ-007 | US-006 | pages/usuarios/UsuarioForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UsuarioForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'contratista_user',
        tipo_contratista_id: '',
        dependencia_id: '',
        eecc_nombre: '',
        rut: '',
        telefono: '',
        contratista_id: '' // New field to link to contractor
    });

    const [dependencias, setDependencias] = useState([]);
    const [tiposContratista, setTiposContratista] = useState([]);
    const [contratistas, setContractors] = useState([]); // List of contractors
    const [roles, setRoles] = useState([]); // List of roles
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');

    // Scoped resources for the selected contractor
    const [scopedServices, setScopedServices] = useState([]);
    const [scopedDependencies, setScopedDependencies] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Determine if we need to fetch contractors list (Admin/ADC)
                const promises = [
                    api.get('/resources/dependencias'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/roles'), // Fetch roles
                    // Fetch contractors if user can assign them
                    ['admin', 'administrador_contrato'].includes(currentUser.role)
                        ? api.get('/contratistas?activo=1')
                        : Promise.resolve({ data: { data: [] } })
                ];

                const [depsRes, tiposRes, rolesRes, contratistasRes] = await Promise.all(promises);

                setDependencias(depsRes.data.data);
                setTiposContratista(tiposRes.data.data);
                const fetchedRoles = rolesRes.data.data || [];
                setRoles(fetchedRoles);
                setContractors(contratistasRes.data.data);

                if (isEdit) {
                    const userRes = await api.get(`/usuarios/${id}`);
                    const u = userRes.data.data;
                    setForm({
                        name: u.name,
                        email: u.email,
                        password: '', // Don't show password
                        role: u.role,
                        tipo_contratista_id: u.tipo_contratista_id || '',
                        dependencia_id: u.dependencia_id || '',
                        eecc_nombre: u.eecc_nombre || '',
                        rut: u.rut || '',
                        telefono: u.telefono || '',
                        contratista_id: u.contratista_id || u.parent_id || '' // parent_id is often used as contratista_id link
                    });
                } else {
                    // Pre-fill for Contratista Admin creating a user
                    if (currentUser.role === 'contratista_admin') {
                        setForm(prev => ({
                            ...prev,
                            contratista_id: currentUser.contratista_id || currentUser.id,
                            role: 'contratista_user'
                        }));
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Error al cargar datos');
            } finally {
                setPageLoading(false);
            }
        };
        loadData();
    }, [id, currentUser]);

    // Effect to update scoped resources when contratista_id changes
    useEffect(() => {
        const updateScopes = async () => {
            // Determine the ID of the contractor to fetch scope from
            // If admin/adc select from dropdown (form.contratista_id)
            // If contractor admin, use their own id (currentUser.contratista_id or id)
            const cId = form.contratista_id || (currentUser.role === 'contratista_admin' ? (currentUser.contratista_id || currentUser.id) : null);

            if (!cId) {
                setScopedServices([]);
                setScopedDependencies([]);
                return;
            }

            try {
                // Fetch specific contractor with vinculaciones to get scope
                // We need to fetch it to get vinculaciones, as the list might not have them fully loaded or user might not have list access
                const res = await api.get(`/contratistas/${cId}`);
                const selectedContratista = res.data.data;

                if (selectedContratista && selectedContratista.vinculaciones) {
                    // Extract unique services and dependencies from vinculaciones
                    const services = new Map();
                    const deps = new Map();

                    selectedContratista.vinculaciones.forEach(v => {
                        if (v.activo) {
                            if (v.servicio) services.set(v.servicio.id, v.servicio);
                            if (v.dependencia) deps.set(v.dependencia.id, v.dependencia);
                        }
                    });

                    setScopedServices(Array.from(services.values()));
                    setScopedDependencies(Array.from(deps.values()));
                }
            } catch (err) {
                console.error("Error fetching contractor details for scope", err);
            }
        };

        if (form.contratista_id || currentUser.role === 'contratista_admin') {
            updateScopes();
        }
    }, [form.contratista_id, currentUser]); // Removed contratistas from dep to avoid loop if list changes


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = { ...form };
            if (isEdit && !payload.password) {
                delete payload.password;
            }

            // Map contratista_id to parent_id if needed by backend or keep distinct
            // For now, let's assumes backend handles 'contratista_id' or we pass it as 'parent_id' for linking
            // FIX: Do NOT overwrite parent_id with contratista_id, as they are different tables.
            // if (payload.contratista_id) {
            //     payload.parent_id = payload.contratista_id;
            // }

            // Remove unused fields from payload if they exist
            delete payload.asignacion_inicial;

            if (isEdit) {
                await api.put(`/usuarios/${id}`, payload);
            } else {
                await api.post('/usuarios', payload);
            }
            navigate('/usuarios');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar usuario');
        } finally {
            setLoading(false);
        }
    };

    const isContractorRole = ['contratista_admin', 'contratista_user'].includes(form.role);

    if (pageLoading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <button onClick={() => navigate(-1)} className="btn-back">
                    <ArrowLeft size={18} /> Volver
                </button>
                <h1>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h1>
            </header>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-row">
                    <div className="form-group">
                        <label>Nombre *</label>
                        <input
                            type="text" required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email *</label>
                        <input
                            type="email" required
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>{isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
                        <input
                            type="password"
                            required={!isEdit}
                            minLength={6}
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Rol *</label>
                        <select
                            value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                            disabled={currentUser.role === 'contratista_admin'}
                        >
                            <option value="">Seleccione Rol...</option>
                            {roles.filter(r => {
                                // Filter roles based on current user privileges
                                if (currentUser.role === 'contratista_admin') {
                                    return r.name === 'contratista_user';
                                }
                                if (currentUser.role === 'administrador_contrato') {
                                    // Admins can create contractors or other admins maybe? 
                                    // For now let's allow them to create contratista_user and contratista_admin
                                    // But maybe not System Admin
                                    return ['contratista_user', 'contratista_admin'].includes(r.name);
                                }
                                return true; // Super admin sees all
                            }).map(r => (
                                <option key={r.id} value={r.name}>{r.name.replace('_', ' ').toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>RUT</label>
                        <input
                            type="text"
                            value={form.rut}
                            onChange={e => setForm({ ...form, rut: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="text"
                            value={form.telefono}
                            onChange={e => setForm({ ...form, telefono: e.target.value })}
                        />
                    </div>
                </div>

                {/* Fields for Abastible Users */}
                {!isContractorRole && form.role === 'admin' && (
                    <div className="form-group">
                        <label>Dependencia (Gerencia)</label>
                        <select
                            value={form.dependencia_id}
                            onChange={e => setForm({ ...form, dependencia_id: e.target.value })}
                        >
                            <option value="">Seleccione...</option>
                            {dependencias.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Fields for Contractors */}
                {isContractorRole && (
                    <>
                        {/* Admin selects Contractor Company */}
                        {['admin', 'administrador_contrato'].includes(currentUser.role) && (
                            <div className="form-group">
                                <label>Empresa Contratista *</label>
                                <select
                                    required
                                    value={form.contratista_id}
                                    onChange={e => setForm({
                                        ...form,
                                        contratista_id: e.target.value,
                                        // Reset Scope when company changes
                                        tipo_contratista_id: '',
                                        dependencia_id: ''
                                    })}
                                >
                                    <option value="">Seleccione Empresa...</option>
                                    {contratistas.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="section-divider" style={{ margin: '2rem 0', borderTop: '2px dashed var(--color-border)', paddingTop: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-brand-primary)' }}>
                                Alcance de Acceso (Scope)
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                                Defina a qué Servicio y Dependencia tendrá acceso este usuario.
                                <br />
                                <em>Las opciones están limitadas a los contratos vigentes de la empresa seleccionada.</em>
                            </p>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Servicio Asociado *</label>
                                    <select
                                        required
                                        value={form.tipo_contratista_id}
                                        onChange={e => setForm({ ...form, tipo_contratista_id: e.target.value })}
                                        disabled={!form.contratista_id && currentUser.role !== 'contratista_admin'}
                                    >
                                        <option value="">Seleccione Servicio...</option>
                                        {scopedServices.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Dependencia Permitida *</label>
                                    <select
                                        required
                                        value={form.dependencia_id}
                                        onChange={e => setForm({ ...form, dependencia_id: e.target.value })}
                                        disabled={!form.contratista_id && currentUser.role !== 'contratista_admin'}
                                    >
                                        <option value="">Seleccione Dependencia...</option>
                                        {scopedDependencies.map(d => (
                                            <option key={d.id} value={d.id}>{d.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="form-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Usuario'}
                    </button>
                </div>
            </form>
        </div>
    );
}

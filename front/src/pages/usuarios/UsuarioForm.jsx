// IEEE Trace: REQ-007 | US-006 | pages/usuarios/UsuarioForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, User, Shield, Briefcase, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/common/SearchableSelect';
import './UsuarioForm.css';

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
        contratista_id: '', // New field to link to contractor
        activo: true
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
                    api.get('/resources/roles'), // Fetch roles from resources
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
                        contratista_id: u.contratista_id || u.parent_id || '', // parent_id is often used as contratista_id link
                        activo: u.activo ?? true
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
            const cId = form.contratista_id || (currentUser.role === 'contratista_admin' ? (currentUser.contratista_id || currentUser.id) : null);

            if (!cId) {
                setScopedServices([]);
                setScopedDependencies([]);
                return;
            }

            try {
                const res = await api.get(`/contratistas/${cId}`);
                const selectedContratista = res.data.data;

                if (selectedContratista && selectedContratista.vinculaciones) {
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
    }, [form.contratista_id, currentUser]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = { ...form };
            if (isEdit && !payload.password) {
                delete payload.password;
            }

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
        <div className="page-container-usuario">
            <header className="usuario-edit-header">
                <button onClick={() => navigate(-1)} className="btn-back-arrow" title="Volver">
                    <ArrowLeft size={24} />
                </button>
                <div className="usuario-edit-title-row">
                    {isEdit ? <Pencil size={20} className="icon-pencil-header" /> : <User size={20} className="icon-user-header" />}
                    <span>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
                </div>
            </header>

            {error && <div className="error-message" style={{ maxWidth: 800, margin: '0 auto 16px' }}>{error}</div>}

            <div className="usuario-edit-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section-usuario">
                        <div className="section-subtitle-usuario">
                            <User size={18} />
                            <span>Datos Personales</span>
                        </div>

                        <div className="input-row-usuario">
                            <div className="input-group-usuario">
                                <label className="label-usuario">Nombre <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className="input-field-usuario"
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="input-group-usuario">
                                <label className="label-usuario">Email <span className="required">*</span></label>
                                <input
                                    type="email"
                                    className="input-field-usuario"
                                    required
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="input-row-usuario">
                            <div className="input-group-usuario">
                                <label className="label-usuario">RUT</label>
                                <input
                                    type="text"
                                    className="input-field-usuario"
                                    value={form.rut}
                                    onChange={e => setForm({ ...form, rut: e.target.value })}
                                />
                            </div>
                            <div className="input-group-usuario">
                                <label className="label-usuario">Teléfono</label>
                                <input
                                    type="text"
                                    className="input-field-usuario"
                                    value={form.telefono}
                                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="section-subtitle-usuario" style={{ marginTop: '16px' }}>
                            <Shield size={18} />
                            <span>Acceso y Seguridad</span>
                        </div>

                        <div className="input-row-usuario">
                            <div className="input-group-usuario">
                                <label className="label-usuario">{isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña'}</label>
                                <input
                                    type="password"
                                    className="input-field-usuario"
                                    required={false}
                                    minLength={6}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder={isEdit ? "Dejar en blanco para mantener" : "Autogenerada si se deja en blanco"}
                                />
                                <small style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    {!isEdit && "💡 Si no ingresa una clave, el sistema generará una segura automáticamente."}
                                </small>
                            </div>
                            <div className="input-group-usuario">
                                <label className="label-usuario">Rol *</label>
                                <select
                                    className="select-field-usuario"
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    disabled={currentUser.role === 'contratista_admin' || (isEdit && String(id) === String(currentUser.id))}
                                >
                                    <option value="">Seleccione Rol...</option>
                                    {roles.filter(r => {
                                        if (currentUser.role === 'contratista_admin' || currentUser.role === 'contratista_admin_eecc') {
                                            return r.name === 'contratista_user';
                                        }
                                        if (currentUser.role === 'administrador_contrato') {
                                            return ['contratista_user', 'contratista_admin', 'contratista_admin_eecc'].includes(r.name);
                                        }
                                        return true;
                                    }).map(r => (
                                        <option key={r.id} value={r.name}>{r.name.replace('_', ' ').toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                id="user_activo"
                                checked={form.activo}
                                onChange={e => setForm({ ...form, activo: e.target.checked })}
                                disabled={isEdit && String(id) === String(currentUser.id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="user_activo" style={{ cursor: 'pointer', fontWeight: '500', color: '#1e293b' }}>
                                Usuario Activo
                            </label>
                            {isEdit && String(id) === String(currentUser.id) && (
                                <small style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 'bold' }}>
                                    (No puedes desactivar tu propia cuenta)
                                </small>
                            )}
                        </div>

                        {/* Fields for Abastible Users */}
                        {!isContractorRole && form.role === 'admin' && (
                            <div className="input-group-usuario">
                                <label className="label-usuario">Dependencia (Gerencia)</label>
                                <select
                                    className="select-field-usuario"
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
                                <div className="section-subtitle-usuario" style={{ marginTop: '16px' }}>
                                    <Briefcase size={18} />
                                    <span>Alcance de Acceso (Scope)</span>
                                </div>
                                <span className="scope-description">
                                    Defina el servicio y dependencia para este usuario. Las opciones están limitadas a los contratos vigentes.
                                </span>

                                {/* Admin selects Contractor Company */}
                                {['admin', 'administrador_contrato'].includes(currentUser.role) && (
                                    <div className="input-group-usuario">
                                        <label className="label-usuario">Empresa Contratista <span className="required">*</span></label>
                                        <SearchableSelect
                                            options={contratistas}
                                            value={form.contratista_id}
                                            onChange={val => setForm({
                                                ...form,
                                                contratista_id: val,
                                                tipo_contratista_id: '',
                                                dependencia_id: ''
                                            })}
                                            placeholder="Seleccione Empresa..."
                                            dropdownTop="calc(34% + 4px)"
                                            containerFlex="1 1 auto"
                                        />
                                    </div>
                                )}

                                <div className="input-row-usuario">
                                    <div className="input-group-usuario">
                                        <label className="label-usuario">Servicio Asociado <span className="required">*</span></label>
                                        <SearchableSelect
                                            options={scopedServices}
                                            value={form.tipo_contratista_id}
                                            onChange={val => setForm({ ...form, tipo_contratista_id: val })}
                                            placeholder="Seleccione Servicio..."
                                            disabled={!form.contratista_id && currentUser.role !== 'contratista_admin'}
                                            dropdownTop="calc(34% + 4px)"
                                            containerFlex="1 1 auto"
                                        />
                                    </div>
                                    <div className="input-group-usuario">
                                        <label className="label-usuario">Dependencia Permitida <span className="required">*</span></label>
                                        <SearchableSelect
                                            options={scopedDependencies}
                                            value={form.dependencia_id}
                                            onChange={val => setForm({ ...form, dependencia_id: val })}
                                            placeholder="Seleccione Dependencia..."
                                            disabled={!form.contratista_id && currentUser.role !== 'contratista_admin'}
                                            dropdownTop="calc(34% + 4px)"
                                            containerFlex="1 1 auto"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="actions-row-usuario">
                        <button type="button" onClick={() => navigate(-1)} className="btn-cancel-usuario">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save-usuario" disabled={loading}>
                            {loading ? 'Guardando...' : <><Save size={18} /> Guardar Usuario</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

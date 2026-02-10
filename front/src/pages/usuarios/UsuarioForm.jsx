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
        asignacion_inicial: {
            programa_id: '',
            servicio_id: '',
            dependencia_id: '',
            administrador_contrato_id: ''
        }
    });

    const [dependencias, setDependencias] = useState([]);
    const [tiposContratista, setTiposContratista] = useState([]);
    const [programas, setProgramas] = useState([]);
    const [adcs, setAdcs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [depsRes, tiposRes, programasRes, adcsRes] = await Promise.all([
                    api.get('/resources/dependencias'),
                    api.get('/resources/tipos-contratista'),
                    api.get('/programas'),
                    api.get('/usuarios?role=administrador_contrato')
                ]);
                setDependencias(depsRes.data.data);
                setTiposContratista(tiposRes.data.data);
                setProgramas(programasRes.data.data);
                setAdcs(adcsRes.data.data);

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
                        telefono: u.telefono || ''
                    });
                }
            } catch (err) {
                console.error(err);
                setError('Error al cargar datos');
            } finally {
                setPageLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = { ...form };
            if (isEdit && !payload.password) {
                delete payload.password;
            }

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

    const isContractor = ['contratista_admin', 'contratista_user'].includes(form.role);

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
                            <option value="contratista_user">Contratista Operativo</option>
                            <option value="contratista_admin">Contratista Admin</option>
                            <option value="administrador_contrato">Admin Contrato (Abastible)</option>
                            <option value="admin">Super Admin</option>
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
                {!isContractor && form.role === 'admin' && (
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
                {isContractor && (
                    <>
                        <div className="form-group">
                            <label>Empresa Contratista</label>
                            <input
                                type="text"
                                placeholder="Nombre de la empresa"
                                value={form.eecc_nombre}
                                onChange={e => setForm({ ...form, eecc_nombre: e.target.value })}
                            />
                        </div>

                        {!isEdit && (
                            <div className="section-divider" style={{ margin: '2rem 0', borderTop: '2px dashed var(--color-border)', paddingTop: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-brand-primary)' }}>
                                    Asignación Inicial Obligatoria (Contrato)
                                </h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Dependencia / Planta *</label>
                                        <select
                                            required
                                            value={form.asignacion_inicial.dependencia_id}
                                            onChange={e => setForm({
                                                ...form,
                                                asignacion_inicial: { ...form.asignacion_inicial, dependencia_id: e.target.value }
                                            })}
                                        >
                                            <option value="">Seleccione...</option>
                                            {dependencias.map(d => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Programa OIEM *</label>
                                        <select
                                            required
                                            value={form.asignacion_inicial.programa_id}
                                            onChange={e => setForm({
                                                ...form,
                                                asignacion_inicial: { ...form.asignacion_inicial, programa_id: e.target.value }
                                            })}
                                        >
                                            <option value="">Seleccione...</option>
                                            {programas.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Servicio asignado *</label>
                                        <select
                                            required
                                            value={form.asignacion_inicial.servicio_id}
                                            onChange={e => setForm({
                                                ...form,
                                                asignacion_inicial: { ...form.asignacion_inicial, servicio_id: e.target.value }
                                            })}
                                        >
                                            <option value="">Seleccione...</option>
                                            {tiposContratista
                                                .filter(t => !form.asignacion_inicial.programa_id || t.programa_id == form.asignacion_inicial.programa_id)
                                                .map(t => (
                                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                                ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Administrador Contrato (ADC)</label>
                                        <select
                                            value={form.asignacion_inicial.administrador_contrato_id}
                                            onChange={e => setForm({
                                                ...form,
                                                asignacion_inicial: { ...form.asignacion_inicial, administrador_contrato_id: e.target.value }
                                            })}
                                        >
                                            <option value="">Sin asignar (Opcional)</option>
                                            {adcs.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
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

// IEEE Trace: REQ-009 | US-051 | pages/contratistas/ContratistaForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Building, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ContratistaForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        nombre: '',
        rut: '',
        direccion: '',
        telefono: '',
        email_contacto: '',
        vinculacion_inicial: { // Only for creation
            dependencia_id: '',
            servicio_id: '',
            administrador_contrato_id: ''
        }
    });

    const [dependencias, setDependencias] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [adcs, setAdcs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadResources = async () => {
            try {
                const [depsRes, servsRes, adcsRes] = await Promise.all([
                    api.get('/resources/dependencias'),
                    api.get('/servicios'),
                    api.get('/usuarios?role=administrador_contrato')
                ]);
                setDependencias(depsRes.data.data);
                setServicios(servsRes.data.data);
                setAdcs(adcsRes.data.data);

                if (isEdit) {
                    const res = await api.get(`/contratistas/${id}`);
                    setForm(prev => ({ ...prev, ...res.data.data }));
                }
            } catch (err) {
                console.error(err);
                setError('Error al cargar datos');
            }
        };
        loadResources();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEdit) {
                await api.put(`/contratistas/${id}`, form);
            } else {
                await api.post('/contratistas', form);
            }
            navigate('/contratistas');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar contratista');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <button onClick={() => navigate(-1)} className="btn-back">
                    <ArrowLeft size={18} /> Volver
                </button>
                <h1>{isEdit ? 'Editar Empresa Contratista' : 'Nueva Empresa Contratista'}</h1>
            </header>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="section-title">
                    <Building size={20} className="text-brand-primary" />
                    <h3>Datos de la Empresa</h3>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Nombre Empresa *</label>
                        <input
                            type="text" required
                            value={form.nombre}
                            onChange={e => setForm({ ...form, nombre: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>RUT *</label>
                        <input
                            type="text" required
                            value={form.rut}
                            onChange={e => setForm({ ...form, rut: e.target.value })}
                            placeholder="12.345.678-9"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Dirección</label>
                        <input
                            type="text"
                            value={form.direccion}
                            onChange={e => setForm({ ...form, direccion: e.target.value })}
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

                <div className="form-group">
                    <label>Email Contacto</label>
                    <input
                        type="email"
                        value={form.email_contacto}
                        onChange={e => setForm({ ...form, email_contacto: e.target.value })}
                    />
                </div>

                {/* Initial Vinculacion (Only Create) */}
                {!isEdit && (
                    <div className="mt-8 pt-6 border-t border-dashed border-gray-300">
                        <div className="section-title mb-4">
                            <Layers size={20} className="text-brand-secondary" />
                            <h3>Vinculación Inicial</h3>
                            <p className="text-sm text-gray-500 font-normal ml-2">(Obligatorio para iniciar operaciones)</p>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Dependencia / Planta *</label>
                                <select
                                    required
                                    value={form.vinculacion_inicial.dependencia_id}
                                    onChange={e => setForm({
                                        ...form,
                                        vinculacion_inicial: { ...form.vinculacion_inicial, dependencia_id: e.target.value }
                                    })}
                                >
                                    <option value="">Seleccione...</option>
                                    {dependencias.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Servicio Prestado *</label>
                                <select
                                    required
                                    value={form.vinculacion_inicial.servicio_id}
                                    onChange={e => setForm({
                                        ...form,
                                        vinculacion_inicial: { ...form.vinculacion_inicial, servicio_id: e.target.value }
                                    })}
                                >
                                    <option value="">Seleccione...</option>
                                    {servicios.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Administrador de Contrato (ADC) *</label>
                            <select
                                required
                                value={form.vinculacion_inicial.administrador_contrato_id}
                                onChange={e => setForm({
                                    ...form,
                                    vinculacion_inicial: { ...form.vinculacion_inicial, administrador_contrato_id: e.target.value }
                                })}
                            >
                                <option value="">Seleccione Admin Contrato...</option>
                                {adcs.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="form-actions mt-8">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Empresa'}
                    </button>
                </div>
            </form>
        </div>
    );
}

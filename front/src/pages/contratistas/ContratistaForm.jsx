// IEEE Trace: REQ-009 | US-051 | pages/contratistas/ContratistaForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Building, Layers, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ContratistaForm.css';

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
        activo: true,
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
        <div className="page-container-contratista">
            <header className="contratista-edit-header">
                <button onClick={() => navigate(-1)} className="btn-back-arrow" title="Volver">
                    <ArrowLeft size={24} />
                </button>
                <div className="contratista-edit-title-row">
                    {isEdit ? <Pencil size={20} className="icon-pencil-header" /> : <Building size={20} className="icon-building-header" />}
                    <span>{isEdit ? 'Editar Empresa Contratista' : 'Nueva Empresa Contratista'}</span>
                </div>
            </header>

            {error && <div className="error-message" style={{ maxWidth: 800, margin: '0 auto 16px' }}>{error}</div>}

            <div className="contratista-edit-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section-contratista">
                        <div className="section-subtitle-contratista">
                            <Building size={18} />
                            <span>Datos de la Empresa</span>
                        </div>

                        <div className="input-row-contratista">
                            <div className="input-group-contratista">
                                <label className="label-contratista">Nombre Empresa <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className="input-field-contratista"
                                    required
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                />
                            </div>
                            <div className="input-group-contratista">
                                <label className="label-contratista">RUT <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className="input-field-contratista"
                                    required
                                    value={form.rut}
                                    onChange={e => setForm({ ...form, rut: e.target.value })}
                                    placeholder="12.345.678-9"
                                />
                            </div>
                        </div>

                        <div className="input-row-contratista">
                            <div className="input-group-contratista">
                                <label className="label-contratista">Dirección</label>
                                <input
                                    type="text"
                                    className="input-field-contratista"
                                    value={form.direccion}
                                    onChange={e => setForm({ ...form, direccion: e.target.value })}
                                />
                            </div>
                            <div className="input-group-contratista">
                                <label className="label-contratista">Teléfono</label>
                                <input
                                    type="text"
                                    className="input-field-contratista"
                                    value={form.telefono}
                                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="input-group-contratista">
                            <label className="label-contratista">Email Contacto</label>
                            <input
                                type="email"
                                className="input-field-contratista"
                                value={form.email_contacto}
                                onChange={e => setForm({ ...form, email_contacto: e.target.value })}
                            />
                        </div>

                        <div style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                id="activo"
                                checked={form.activo}
                                onChange={e => setForm({ ...form, activo: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="activo" style={{ cursor: 'pointer', fontWeight: '500', color: '#1e293b' }}>
                                Empresa Activa
                            </label>
                            <small style={{ color: '#64748b', marginLeft: '8px' }}>
                                (Si se desactiva, no aparecerá en los nuevos periodos)
                            </small>
                        </div>

                        {/* Initial Vinculacion (Only Create) */}
                        {!isEdit && (
                            <div style={{ marginTop: '16px' }}>
                                <div className="section-subtitle-contratista">
                                    <Layers size={18} />
                                    <span>Vinculación Inicial <span className="vinculacion-description">(Requerido)</span></span>
                                </div>

                                <div className="input-row-contratista">
                                    <div className="input-group-contratista">
                                        <label className="label-contratista">Dependencia / Planta <span className="required">*</span></label>
                                        <select
                                            className="select-field-contratista"
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
                                    <div className="input-group-contratista">
                                        <label className="label-contratista">Servicio Prestado <span className="required">*</span></label>
                                        <select
                                            className="select-field-contratista"
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

                                <div className="input-group-contratista" style={{ marginTop: '20px' }}>
                                    <label className="label-contratista">Administrador de Contrato (ADC) <span className="required">*</span></label>
                                    <select
                                        className="select-field-contratista"
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
                    </div>

                    <div className="actions-row-contratista">
                        <button type="button" onClick={() => navigate(-1)} className="btn-cancel-contratista">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save-contratista" disabled={loading}>
                            {loading ? 'Guardando...' : <><Save size={18} /> {isEdit ? 'Actualizar' : 'Guardar Empresa'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

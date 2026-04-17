// IEEE Trace: REQ-001 | DependenciaForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, MapPin, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './DependenciaForm.css';

export default function DependenciaForm() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    useEffect(() => {
        if (user?.role === 'administrador_contrato') {
            navigate('/configuracion/dependencias');
        }
    }, [user, navigate]);

    const [form, setForm] = useState({
        nombre: '',
        nivel_faena: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEdit) {
            const loadData = async () => {
                try {
                    const res = await api.get(`/dependencias/${id}`);
                    setForm(res.data.data);
                } catch (err) {
                    setError('Error al cargar dependencia');
                }
            };
            loadData();
        }
    }, [id, isEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEdit) {
                await api.put(`/dependencias/${id}`, form);
            } else {
                await api.post('/dependencias', form);
            }
            navigate('/configuracion/dependencias');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar dependencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container-dependencia">
            <header className="dependencia-edit-header">
                <button onClick={() => navigate(-1)} className="btn-back-arrow" title="Volver">
                    <ArrowLeft size={24} />
                </button>
                <div className="dependencia-edit-title-row">
                    {isEdit ? <Pencil size={20} className="icon-pencil-header" /> : <MapPin size={20} className="icon-map-header" />}
                    <span>{isEdit ? 'Editar Dependencia' : 'Nueva Dependencia'}</span>
                </div>
            </header>

            {error && <div className="error-message" style={{ maxWidth: 600, margin: '0 auto 16px' }}>{error}</div>}

            <div className="dependencia-edit-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section-dependencia">
                        <div className="section-subtitle-dependencia">
                            <MapPin size={18} />
                            <span>Información General</span>
                        </div>

                        <div className="input-group-dependencia">
                            <label className="label-dependencia">Nombre de la Dependencia / Planta <span className="required">*</span></label>
                            <input
                                type="text"
                                className="input-field-dependencia"
                                required
                                value={form.nombre}
                                onChange={e => setForm({ ...form, nombre: e.target.value })}
                                placeholder="Ej: Planta Maipú, Gerencia Legal..."
                            />
                        </div>

                        <div className="input-group-dependencia" style={{ marginTop: '16px' }}>
                            <label className="label-dependencia">Nivel Faena (ASEM)</label>
                            <select
                                className="input-field-dependencia"
                                value={form.nivel_faena || ''}
                                onChange={e => setForm({ ...form, nivel_faena: e.target.value })}
                            >
                                <option value="">Seleccione Nivel...</option>
                                <option value="Gerencia">Gerencia</option>
                                <option value="Subgerencia">Subgerencia</option>
                                <option value="Planta">Planta</option>
                                <option value="Almacén">Almacén</option>
                                <option value="Oficina">Oficina</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div className="actions-row-dependencia">
                        <button type="button" onClick={() => navigate(-1)} className="btn-cancel-dependencia">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save-dependencia" disabled={loading}>
                            {loading ? 'Guardando...' : <><Save size={18} /> {isEdit ? 'Actualizar' : 'Guardar Dependencia'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

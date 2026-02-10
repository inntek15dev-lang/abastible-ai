// IEEE Trace: REQ-001 | DependenciaForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft } from 'lucide-react';

export default function DependenciaForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        nombre: '',
        activo: 1
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEdit) {
            fetchDependencia();
        }
    }, [id]);

    const fetchDependencia = async () => {
        try {
            const response = await api.get(`/dependencias/${id}`);
            setForm(response.data.data);
        } catch (err) {
            setError('Error al cargar datos');
        }
    };

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
            navigate('/dependencias');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
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
                <h1>{isEdit ? 'Editar Dependencia' : 'Nueva Dependencia'}</h1>
            </header>

            <form onSubmit={handleSubmit} className="form-card max-w-lg">
                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                    <label htmlFor="nombre">Nombre</label>
                    <input
                        id="nombre"
                        type="text"
                        className="form-control"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            checked={form.activo === 1}
                            onChange={(e) => setForm({ ...form, activo: e.target.checked ? 1 : 0 })}
                        />
                        Activo
                    </label>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}

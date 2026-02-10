// IEEE Trace: REQ-001 | ServicioForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft } from 'lucide-react';

export default function ServicioForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        programa_id: '',
        activo: 1
    });
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProgramas();
        if (isEdit) {
            fetchServicio();
        }
    }, [id]);

    const fetchProgramas = async () => {
        try {
            const response = await api.get('/programas');
            setProgramas(response.data.data);
        } catch (err) {
            console.error('Error loading programs');
        }
    };

    const fetchServicio = async () => {
        try {
            const response = await api.get(`/servicios/${id}`);
            const data = response.data.data;
            setForm({
                nombre: data.nombre,
                descripcion: data.descripcion,
                programa_id: data.programa_id,
                activo: data.activo
            });
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
                await api.put(`/servicios/${id}`, form);
            } else {
                await api.post('/servicios', form);
            }
            navigate('/servicios');
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
                <h1>{isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h1>
            </header>

            <form onSubmit={handleSubmit} className="form-card max-w-lg">
                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                    <label htmlFor="programa">Programa</label>
                    <select
                        id="programa"
                        className="form-control"
                        value={form.programa_id}
                        onChange={(e) => setForm({ ...form, programa_id: e.target.value })}
                        required
                    >
                        <option value="">Seleccione Programa...</option>
                        {programas.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="nombre">Nombre del Servicio</label>
                    <input
                        id="nombre"
                        type="text"
                        className="form-control"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea
                        id="descripcion"
                        className="form-control"
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        rows="3"
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

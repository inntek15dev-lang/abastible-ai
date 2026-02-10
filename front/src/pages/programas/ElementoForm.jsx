import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft } from 'lucide-react';

export default function ElementoForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        programa_id: '',
        numero: '',
        nombre: '',
        descripcion: '',
        orden: 0
    });

    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProgramas();
        if (isEdit) {
            fetchElemento();
        }
    }, [id]);

    const fetchProgramas = async () => {
        try {
            const res = await api.get('/programas');
            setProgramas(res.data.data);
            if (!isEdit && res.data.data.length > 0) {
                setForm(prev => ({ ...prev, programa_id: res.data.data[0].id }));
            }
        } catch (err) {
            console.error('Error loading programs');
        }
    };

    const fetchElemento = async () => {
        setLoading(true);
        try {
            const response = await api.get('/elementos'); // Since we don't have show by ID, we might need to filter or fix backend.
            // Wait, elementoController has update which uses findByPk, but routes show?
            // Checking elementoController... update uses req.params.id.
            // But usually we need a GET /elementos/:id.
            // Let's check routes...
            // Routes: 
            // router.get('/elementos', auth, elementoController.index);
            // router.post('/elementos', ...);
            // router.put('/elementos/:id', ...);
            // router.delete('/elementos/:id', ...);
            // MISSING GET /elementos/:id

            // Workaround: Get all and filter 
            const all = await api.get('/elementos');
            const found = all.data.data.find(e => e.id === parseInt(id));
            if (found) {
                setForm({
                    programa_id: found.programa_id,
                    numero: found.numero,
                    nombre: found.nombre,
                    descripcion: found.descripcion || '',
                    orden: found.orden
                });
            } else {
                setError('Elemento no encontrado');
            }
        } catch (err) {
            setError('Error al cargar elemento');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await api.put(`/elementos/${id}`, form);
            } else {
                await api.post('/elementos', form);
            }
            navigate('/elementos');
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
                <h1>{isEdit ? 'Editar Elemento' : 'Nuevo Elemento'}</h1>
            </header>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '800px' }}>
                <div className="form-group">
                    <label>Programa *</label>
                    <select
                        className="form-control"
                        value={form.programa_id}
                        onChange={(e) => setForm({ ...form, programa_id: e.target.value })}
                        required
                    >
                        <option value="">Seleccione Programa</option>
                        {programas.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Número *</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.numero}
                            onChange={(e) => setForm({ ...form, numero: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Orden</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.orden}
                            onChange={(e) => setForm({ ...form, orden: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Nombre *</label>
                    <input
                        type="text"
                        className="form-control"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                        className="form-control"
                        rows="4"
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />
                </div>

                <div className="form-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}

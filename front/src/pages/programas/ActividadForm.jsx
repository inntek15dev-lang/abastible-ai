import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft } from 'lucide-react';

export default function ActividadForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        elemento_id: '',
        codigo: '',
        actividad: '',
        descripcion: '',
        criterios: '',
        frecuencia: '',
        requiere_evidencia: false,
        orden: 0
    });

    const [programas, setProgramas] = useState([]);
    const [elementos, setElementos] = useState([]);
    const [selectedPrograma, setSelectedPrograma] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchResources();
        if (isEdit) {
            fetchActividad();
        }
    }, [id]);

    // When program changes, load its elements
    useEffect(() => {
        if (selectedPrograma) {
            api.get(`/elementos?programa_id=${selectedPrograma}`)
                .then(res => setElementos(res.data.data))
                .catch(console.error);
        } else {
            setElementos([]);
        }
    }, [selectedPrograma]);

    const fetchResources = async () => {
        try {
            const res = await api.get('/programas');
            setProgramas(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchActividad = async () => {
        setLoading(true);
        try {
            // Fetch all (since we don't have get by ID yet or to be safe)
            const all = await api.get('/actividades');
            const found = all.data.data.find(a => a.id === parseInt(id));

            if (found) {
                setForm({
                    elemento_id: found.elemento_id,
                    codigo: found.codigo,
                    actividad: found.actividad || '',
                    descripcion: found.descripcion,
                    criterios: found.criterios || '',
                    frecuencia: found.frecuencia || '',
                    requiere_evidencia: found.requiere_evidencia === 1 || found.requiere_evidencia === true,
                    orden: found.orden
                });

                // Set parent selection logic
                // We need to find the program of this element to pre-fill dropdowns
                if (found.elemento && found.elemento.programa_id) {
                    setSelectedPrograma(found.elemento.programa_id);
                } else {
                    // Fallback: fetch element details if relationship not loaded deeply enough
                    // But list endpoint usually includes it or we can fetch element separately
                    const elemRes = await api.get('/elementos');
                    const parentElem = elemRes.data.data.find(e => e.id === found.elemento_id);
                    if (parentElem) {
                        setSelectedPrograma(parentElem.programa_id);
                    }
                }
            } else {
                setError('Actividad no encontrada');
            }
        } catch (err) {
            setError('Error al cargar actividad');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...form };
            if (isEdit) {
                await api.put(`/actividades/${id}`, payload);
            } else {
                await api.post('/actividades', payload);
            }
            navigate('/actividades');
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
                <h1>{isEdit ? 'Editar Actividad' : 'Nueva Actividad'}</h1>
            </header>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '800px' }}>

                <div className="form-row">
                    <div className="form-group">
                        <label>Programa (Filtrar Elementos)</label>
                        <select
                            className="form-control"
                            value={selectedPrograma}
                            onChange={(e) => setSelectedPrograma(e.target.value)}
                        >
                            <option value="">Seleccione Programa</option>
                            {programas.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Elemento *</label>
                        <select
                            className="form-control"
                            value={form.elemento_id}
                            onChange={(e) => setForm({ ...form, elemento_id: e.target.value })}
                            required
                            disabled={!selectedPrograma}
                        >
                            <option value="">Seleccione Elemento</option>
                            {elementos.map(e => (
                                <option key={e.id} value={e.id}>{e.numero}. {e.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Código *</label>
                        <input
                            type="text"
                            className="form-control"
                            value={form.codigo}
                            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Frecuencia</label>
                        <input
                            type="text"
                            className="form-control"
                            value={form.frecuencia}
                            onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Título Actividad *</label>
                    <input
                        type="text"
                        className="form-control"
                        value={form.actividad}
                        onChange={(e) => setForm({ ...form, actividad: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Descripción *</label>
                    <textarea
                        className="form-control"
                        rows="3"
                        value={form.descripcion}
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Criterios de Aceptación</label>
                    <textarea
                        className="form-control"
                        rows="3"
                        value={form.criterios}
                        onChange={(e) => setForm({ ...form, criterios: e.target.value })}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Orden</label>
                        <input
                            type="number"
                            className="form-control"
                            value={form.orden}
                            onChange={(e) => setForm({ ...form, orden: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '2rem' }}>
                        <label className="checkbox-field">
                            <input
                                type="checkbox"
                                checked={form.requiere_evidencia}
                                onChange={(e) => setForm({ ...form, requiere_evidencia: e.target.checked })}
                            />
                            Requiere Evidencia
                        </label>
                    </div>
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

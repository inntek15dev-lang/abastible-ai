import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Paperclip, Pencil, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function ActividadForm() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    useEffect(() => {
        if (user?.role === 'administrador_contrato') {
            navigate('/programas');
        }
    }, [user, navigate]);

    const [form, setForm] = useState({
        elemento_id: '',
        codigo: '',
        actividad: '',
        descripcion: '',
        criterios: '',
        frecuencia: '',
        requiere_evidencia: false,
        orden: 0,
        activo: true
    });

    const [plantillaFile, setPlantillaFile] = useState(null);

    const [programas, setProgramas] = useState([]);
    const [elementos, setElementos] = useState([]);
    const [selectedPrograma, setSelectedPrograma] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { state } = useLocation(); // Import useLocation


    useEffect(() => {
        fetchResources();
        if (isEdit) {
            fetchActividad();
        } else if (state && state.elemento_id) {
            setForm(prev => ({ ...prev, elemento_id: state.elemento_id }));
            // We need to find the program for this element to select it
            api.get('/elementos').then(res => {
                const elem = res.data.data.find(e => e.id === state.elemento_id);
                if (elem) setSelectedPrograma(elem.programa_id);
            });
        }
    }, [id, state]);

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
                    orden: found.orden,
                    activo: found.activo !== undefined ? found.activo : true,
                    template_url: found.template_url
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
            const formData = new FormData();

            // Append standard fields
            Object.keys(form).forEach(key => {
                if (typeof form[key] === 'boolean') {
                    formData.append(key, form[key] ? '1' : '0');
                } else {
                    formData.append(key, form[key]);
                }
            });

            // Append File if selected
            if (plantillaFile) {
                formData.append('plantilla', plantillaFile);
            }

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (isEdit) {
                // Use POST with _method=PUT to ensure file upload compatibility if needed, 
                // but trying standard PUT first as some modern backends handle it.
                // If it fails, we can switch to POST + _method.
                await api.put(`/actividades/${id}`, formData, config);
                toast.success('Guardado con exito');
                setPlantillaFile(null);
                fetchActividad();
            } else {
                await api.post('/actividades', formData, config);
                toast.success('Guardado con exito');
                navigate('/actividades');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    // Helper to get program name for title
    const getProgramName = () => {
        if (selectedPrograma) {
            const prog = programas.find(p => p.id == selectedPrograma);
            return prog ? `- ${prog.nombre}` : '';
        }
        return '';
    };

    return (
        <div className="parko-form-container">
            <header className="parko-header">
                <button onClick={() => navigate(-1)} className="parko-back-btn" title="Volver">
                    <ArrowLeft size={20} />
                </button>
                <div className="parko-title">
                    <Pencil size={18} className="parko-title-icon" />
                    <span>{isEdit ? 'Editar Actividad' : 'Nueva Actividad'}</span>
                    <span className="parko-subtitle">{getProgramName()}</span>
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="parko-card">
                <div className="parko-form-grid">

                    {/* Program Selection */}
                    <div className="parko-group">
                        <label className="parko-label">
                            Programa <span className="parko-asterisk">*</span>
                        </label>
                        <select
                            className="parko-select"
                            value={selectedPrograma || ''}
                            onChange={(e) => setSelectedPrograma(e.target.value)}
                        >
                            <option value="">Seleccione Programa</option>
                            {programas.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Elemento */}
                    <div className="parko-group">
                        <label className="parko-label">Elemento <span className="parko-asterisk">*</span></label>
                        <select
                            className="parko-select"
                            value={form.elemento_id || ''}
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

                    {/* Row: Code | Orden */}
                    <div className="parko-form-row">
                        <div className="parko-group">
                            <label className="parko-label">
                                Número (Código) <span className="parko-asterisk">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.codigo}
                                onChange={e => setForm({ ...form, codigo: e.target.value })}
                                placeholder="1.1"
                                className="parko-input"
                            />
                        </div>
                        <div className="parko-group">
                            <label className="parko-label">
                                Orden
                            </label>
                            <input
                                type="number"
                                value={form.orden || ''}
                                onChange={e => setForm({ ...form, orden: e.target.value })}
                                placeholder="1"
                                className="parko-input"
                            />
                        </div>
                    </div>

                    {/* Actividad (Nombre) */}
                    <div className="parko-group">
                        <label className="parko-label">
                            Nombre <span className="parko-asterisk">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.actividad}
                            onChange={e => setForm({ ...form, actividad: e.target.value })}
                            placeholder="Nombre de la actividad"
                            className="parko-input"
                        />
                    </div>

                    {/* Descripción */}
                    <div className="parko-group">
                        <label className="parko-label">
                            Descripción
                        </label>
                        <textarea
                            required
                            value={form.descripcion}
                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                            rows={3}
                            className="parko-textarea"
                        />
                    </div>

                    {/* Frecuencia */}
                    <div className="parko-group">
                        <label className="parko-label">
                            Frecuencia <span className="parko-asterisk">*</span>
                        </label>
                        <select
                            value={form.frecuencia}
                            onChange={e => setForm({ ...form, frecuencia: e.target.value })}
                            className="parko-select"
                        >
                            <option value="mensual">Mensual</option>
                            <option value="trimestral">Trimestral</option>
                            <option value="semestral">Semestral</option>
                            <option value="anual">Anual</option>
                            <option value="cuando_aplique">Cuando aplique</option>
                        </select>
                    </div>

                    {/* Criterios */}
                    <div className="parko-group">
                        <label className="parko-label">
                            Criterios de cumplimiento
                        </label>
                        <textarea
                            value={form.criterios || ''}
                            onChange={e => setForm({ ...form, criterios: e.target.value })}
                            rows={3}
                            className="parko-textarea"
                        />
                    </div>

                    {/* Plantilla Upload - NEW */}
                    <div className="parko-group">
                        <label className="parko-label">
                            Plantilla de Evidencia (PDF, Word, Excel)
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="file"
                                onChange={e => setPlantillaFile(e.target.files[0])}
                                className="parko-input"
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                            />
                            {/* Visual hint icon */}
                            <Upload size={18} className="text-gray-400" />
                        </div>
                        {form.template_url && (
                            <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>📎</span>
                                <a
                                    href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${form.template_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#003594', fontWeight: '600', textDecoration: 'underline' }}
                                >
                                    Ver plantilla previa
                                </a>
                            </div>
                        )}
                        {plantillaFile && (
                            <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>📎</span>
                                <a
                                    href={URL.createObjectURL(plantillaFile)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'underline' }}
                                >
                                    Ver archivo cargado ({plantillaFile.name})
                                </a>
                            </div>
                        )}
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginTop: '5px' }}>
                            Subir un archivo para que el contratista lo descargue y complete como evidencia.
                        </span>
                    </div>

                    {/* Checkboxes */}
                    <div className="parko-group">
                        <label className="parko-checkbox-wrapper">
                            <input
                                type="checkbox"
                                checked={form.activo !== false}
                                onChange={e => setForm({ ...form, activo: e.target.checked })}
                                className="parko-checkbox"
                            />
                            <span className="parko-checkbox-label">
                                Activo
                            </span>
                        </label>

                        <label className="parko-checkbox-wrapper" style={{ marginTop: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={form.requiere_evidencia}
                                onChange={e => setForm({ ...form, requiere_evidencia: e.target.checked })}
                                className="parko-checkbox"
                            />
                            <div className="modal-checkbox-content">
                                <span className="parko-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Paperclip size={14} className="text-gray-400" />
                                    Requiere evidencia
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="parko-actions">
                        <button
                            type="button"
                            className="parko-btn-cancel"
                            onClick={() => navigate(-1)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="parko-btn-save"
                            disabled={loading}
                        >
                            <Save size={16} />
                            {loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

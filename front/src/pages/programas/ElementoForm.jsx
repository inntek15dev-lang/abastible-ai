// IEEE Trace: REQ-001 | US-001 | pages/programas/ElementoForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Pencil } from 'lucide-react';
import './ElementoForm.css';

export default function ElementoForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({
        programa_id: '',
        numero: '',
        nombre: '',
        descripcion: '',
        orden: '',
        activo: true
    });
    const [programas, setProgramas] = useState([]);
    const [programName, setProgramName] = useState('');
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
        } catch (err) {
            console.error("Error loading programs", err);
        }
    };

    const fetchElemento = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/elementos/${id}`);
            const data = response.data.data;
            setForm(data);
            setProgramName(data.programa?.nombre || '');
        } catch (err) {
            setError('Error al cargar elemento');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEdit) {
                await api.put(`/elementos/${id}`, form);
            } else {
                await api.post('/elementos', form);
            }
            navigate(`/elementos?programa_id=${form.programa_id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container-edit-element">
            <header className="element-edit-header">
                <button onClick={() => navigate(-1)} className="btn-back-arrow" title="Volver">
                    <ArrowLeft size={24} />
                </button>
                <div className="element-edit-title-row">
                    {isEdit && <Pencil size={20} className="icon-pencil-header" />}
                    <span>{isEdit ? `Editar Elemento ${form.numero}` : 'Nuevo Elemento'}</span>
                    {programName && <span className="program-name-subtitle">- {programName}</span>}
                </div>
            </header>

            {error && <div className="error-message" style={{ maxWidth: 600, margin: '0 auto 16px' }}>{error}</div>}

            <div className="element-edit-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-section-element">
                        {/* Programa Select */}
                        <div className="input-group-element">
                            <label className="label-element">Programa <span className="required">*</span></label>
                            <select
                                className="select-field-element"
                                value={form.programa_id}
                                onChange={(e) => setForm({ ...form, programa_id: e.target.value })}
                                required
                            >
                                <option value="">Seleccione un programa...</option>
                                {programas.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Number and Order Row */}
                        <div className="input-row-element">
                            <div className="input-group-element">
                                <label className="label-element">Número <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className="input-field-element"
                                    value={form.numero}
                                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group-element">
                                <label className="label-element">Orden</label>
                                <input
                                    type="number"
                                    className="input-field-element"
                                    value={form.orden}
                                    onChange={(e) => setForm({ ...form, orden: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Nombre */}
                        <div className="input-group-element">
                            <label className="label-element">Nombre <span className="required">*</span></label>
                            <input
                                type="text"
                                className="input-field-element"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Checkbox */}
                    <div className="checkbox-group-element">
                        <input
                            id="activeCheck"
                            type="checkbox"
                            className="checkbox-input-element"
                            checked={form.activo !== false} // Default true
                            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                        />
                        <label htmlFor="activeCheck" className="label-element" style={{ color: '#202124', cursor: 'pointer' }}>Activo</label>
                    </div>

                    {/* Actions */}
                    <div className="actions-row-element">
                        <button type="button" onClick={() => navigate(-1)} className="btn-cancel-element">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save-element" disabled={loading}>
                            {loading ? 'Guardando...' : (isEdit ? <><Save size={16} /> Actualizar</> : 'Guardar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

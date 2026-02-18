// IEEE Trace: REQ-001 | ServicioForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Edit } from 'lucide-react';

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
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                programa_id: data.programa_id || '',
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
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header Outside Card */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-slate-500 hover:text-slate-700 transition-colors font-medium text-sm mb-2 flex items-center gap-1"
                    >
                        ← Volver
                    </button>
                    <div className="flex items-center gap-2 text-slate-800">
                        <Edit className="text-orange-500" size={24} />
                        <h1 className="text-xl font-bold">
                            {isEdit ? `Editar Servicio: ${form.nombre || '...'}` : 'Nuevo Servicio'}
                        </h1>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                <span className="font-bold">Error:</span> {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Código (Mocked) */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Código <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 focus:outline-none"
                                    value={isEdit ? `SVR-${id.padStart(2, '0')}` : 'GENERADO AUTOMÁTICAMENTE'}
                                    readOnly
                                />
                            </div>

                            {/* Programa Select */}
                            <div>
                                <label htmlFor="programa" className="block text-sm font-bold text-slate-700 mb-2">
                                    Programa que aplica <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="programa"
                                    className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                                    value={form.programa_id}
                                    onChange={(e) => setForm({ ...form, programa_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {programas.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Nombre Input (Full Width) */}
                            <div className="md:col-span-2">
                                <label htmlFor="nombre" className="block text-sm font-bold text-slate-700 mb-2">
                                    Nombre del Servicio <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="nombre"
                                    type="text"
                                    className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    required
                                    placeholder="Ej. TRANSPORTE CILINDROS"
                                />
                            </div>

                            {/* Descripcion Textarea (Full Width) */}
                            <div className="md:col-span-2">
                                <label htmlFor="descripcion" className="block text-sm font-bold text-slate-700 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    id="descripcion"
                                    className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y min-h-[100px]"
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                    rows="4"
                                />
                            </div>

                            {/* Activo Checkbox */}
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                        checked={form.activo === 1}
                                        onChange={(e) => setForm({ ...form, activo: e.target.checked ? 1 : 0 })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Activo</span>
                                </label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// IEEE Trace: REQ-009 | VinculacionForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function VinculacionForm() {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    useEffect(() => {
        if (user?.role === 'administrador_contrato') {
            toast.error('No tiene permisos para gestionar vinculaciones');
            navigate('/vinculaciones');
        }
    }, [user, navigate]);

    const [formData, setFormData] = useState({
        contratista_id: '',
        servicio_id: '',
        dependencia_id: '',
        numero_contrato: '',
        activo: true
    });

    const [contratistas, setContratistas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [contratistasRes, serviciosRes, dependenciasRes] = await Promise.all([
                api.get('/contratistas'),
                api.get('/resources/tipos-contratista'),
                api.get('/resources/dependencias')
            ]);

            setContratistas(contratistasRes.data.data || []);
            setServicios(serviciosRes.data.data || []);
            setDependencias(dependenciasRes.data.data || []);

            if (isEditing) {
                const response = await api.get(`/vinculaciones/${id}`);
                setFormData({
                    contratista_id: response.data.data.contratista_id,
                    servicio_id: response.data.data.servicio_id,
                    dependencia_id: response.data.data.dependencia_id,
                    numero_contrato: response.data.data.numero_contrato || '',
                    activo: response.data.data.activo
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/vinculaciones/${id}`, formData);
                toast.success('Vinculación actualizada');
            } else {
                await api.post('/vinculaciones', formData);
                toast.success('Vinculación creada');
            }
            navigate('/vinculaciones');
        } catch (error) {
            console.error('Error saving vinculacion:', error);
            toast.error(error.response?.data?.message || 'Error al guardar');
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Editar Vinculación' : 'Nueva Vinculación'}
                    </h1>
                </div>
                <button onClick={() => navigate('/vinculaciones')} className="btn-secondary flex items-center gap-2">
                    <ArrowLeft size={18} /> Volver
                </button>
            </header>

            <div className="card max-w-2xl mx-auto p-6">
                <form onSubmit={handleSubmit}>
                    <div className="form-group mb-4">
                        <label>Contratista</label>
                        <select
                            className="form-control"
                            value={formData.contratista_id}
                            onChange={e => setFormData({ ...formData, contratista_id: e.target.value })}
                            required
                            disabled={isEditing}
                        >
                            <option value="">Seleccione Contratista</option>
                            {contratistas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.rut})</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group mb-4">
                        <label>Servicio</label>
                        <select
                            className="form-control"
                            value={formData.servicio_id}
                            onChange={e => setFormData({ ...formData, servicio_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione Servicio</option>
                            {servicios.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group mb-6">
                        <label>Dependencia</label>
                        <select
                            className="form-control"
                            value={formData.dependencia_id}
                            onChange={e => setFormData({ ...formData, dependencia_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione Dependencia</option>
                            {dependencias.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group mb-6">
                        <label>N° Contrato</label>
                        <input
                            type="text"
                            className="form-control"
                            value={formData.numero_contrato}
                            onChange={e => setFormData({ ...formData, numero_contrato: e.target.value })}
                            placeholder="Ej: SAP-12345"
                        />
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <button type="submit" className="btn-primary flex items-center gap-2">
                            <Save size={18} /> Guardar Vinculación
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

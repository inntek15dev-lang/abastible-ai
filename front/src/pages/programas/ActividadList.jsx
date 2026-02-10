import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';

export default function ActividadList() {
    const [actividades, setActividades] = useState([]);
    const [programas, setProgramas] = useState([]);
    const [elementos, setElementos] = useState([]);

    const [selectedPrograma, setSelectedPrograma] = useState('');
    const [selectedElemento, setSelectedElemento] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec } = useAuth();

    // Load initial programs
    useEffect(() => {
        api.get('/programas').then(res => setProgramas(res.data.data)).catch(console.error);
    }, []);

    // Load elements when program changes
    useEffect(() => {
        if (selectedPrograma) {
            api.get(`/elementos?programa_id=${selectedPrograma}`)
                .then(res => setElementos(res.data.data))
                .catch(console.error);
            setSelectedElemento(''); // Reset element selection
        } else {
            setElementos([]);
        }
    }, [selectedPrograma]);

    // Load activities when element changes (or initial load)
    useEffect(() => {
        fetchActividades();
    }, [selectedElemento]);

    const fetchActividades = async () => {
        setLoading(true);
        try {
            const url = selectedElemento
                ? `/actividades?elemento_id=${selectedElemento}`
                : '/actividades'; // Should backend support no filter? usually yes.

            // If explicit filter is better for UX, maybe force selection?
            // For now, list all if no filter, or filter by element.

            const response = await api.get(url);
            setActividades(response.data.data);
        } catch (err) {
            setError('Error al cargar actividades');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar esta actividad?')) return;
        try {
            await api.delete(`/actividades/${id}`);
            fetchActividades();
        } catch (err) {
            alert('Error al eliminar actividad');
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Actividades del Programa</h1>
                    <p className="text-secondary">Gestión de puntos de verificación y auditoría</p>
                </div>
                {canWrite('Programas') && (
                    <Link to="/actividades/new" className="btn-primary">
                        <Plus size={18} /> Nueva Actividad
                    </Link>
                )}
            </header>

            <div className="filters-bar" style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>

                <div className="form-group" style={{ minWidth: '200px' }}>
                    <label>Filtrar por Programa</label>
                    <select
                        className="form-control"
                        value={selectedPrograma}
                        onChange={(e) => setSelectedPrograma(e.target.value)}
                    >
                        <option value="">Todos los Programas</option>
                        {programas.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ minWidth: '200px' }}>
                    <label>Filtrar por Elemento</label>
                    <select
                        className="form-control"
                        value={selectedElemento}
                        onChange={(e) => setSelectedElemento(e.target.value)}
                        disabled={!selectedPrograma}
                    >
                        <option value="">Todos los Elementos</option>
                        {elementos.map(e => (
                            <option key={e.id} value={e.id}>{e.numero}. {e.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Elemento</th>
                                <th>Código</th>
                                <th>Actividad</th>
                                <th>Frecuencia</th>
                                <th>Evidencia</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {actividades.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4">No hay actividades registradas</td>
                                </tr>
                            ) : (
                                actividades.map((act) => (
                                    <tr key={act.id}>
                                        <td>
                                            <span className="badge secondary" title={act.elemento?.nombre}>
                                                {act.elemento?.numero}
                                            </span>
                                        </td>
                                        <td><code>{act.codigo}</code></td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{act.actividad}</div>
                                            <small className="text-secondary">{act.descripcion}</small>
                                        </td>
                                        <td>{act.frecuencia}</td>
                                        <td className="text-center">
                                            {act.requiere_evidencia ? '📷' : '-'}
                                        </td>
                                        <td className="actions-cell">
                                            {canWrite('Programas') && (
                                                <Link to={`/actividades/${act.id}/edit`} className="btn-icon">
                                                    <Edit size={18} />
                                                </Link>
                                            )}
                                            {canExec('Programas') && (
                                                <button onClick={() => handleDelete(act.id)} className="btn-icon danger">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

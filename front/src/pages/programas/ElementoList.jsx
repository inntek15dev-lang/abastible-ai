import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';

export default function ElementoList() {
    const [elementos, setElementos] = useState([]);
    const [programas, setProgramas] = useState([]);
    const [selectedPrograma, setSelectedPrograma] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec } = useAuth();

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        fetchElementos();
    }, [selectedPrograma]);

    const fetchResources = async () => {
        try {
            const res = await api.get('/programas');
            setProgramas(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchElementos = async () => {
        setLoading(true);
        try {
            const url = selectedPrograma ? `/elementos?programa_id=${selectedPrograma}` : '/elementos';
            const response = await api.get(url);
            setElementos(response.data.data);
        } catch (err) {
            setError('Error al cargar elementos');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este elemento? Se eliminarán también sus actividades asociadas.')) return;
        try {
            await api.delete(`/elementos/${id}`);
            fetchElementos();
        } catch (err) {
            alert('Error al eliminar elemento');
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Elementos del Programa</h1>
                    <p className="text-secondary">Gestión de áreas y elementos normativos</p>
                </div>
                {canWrite('Programas') && (
                    <Link to="/elementos/new" className="btn-primary">
                        <Plus size={18} /> Nuevo Elemento
                    </Link>
                )}
            </header>

            <div className="filters-bar" style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Filter size={20} className="text-secondary" />
                <select
                    className="form-control"
                    value={selectedPrograma}
                    onChange={(e) => setSelectedPrograma(e.target.value)}
                    style={{ maxWidth: '300px' }}
                >
                    <option value="">Todos los Programas</option>
                    {programas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">Cargando...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Programa</th>
                                <th>N°</th>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Orden</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {elementos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4">No hay elementos registrados</td>
                                </tr>
                            ) : (
                                elementos.map((elem) => (
                                    <tr key={elem.id}>
                                        <td>
                                            <span className="badge secondary">{elem.programa?.nombre || '-'}</span>
                                        </td>
                                        <td style={{ fontWeight: 'bold' }}>{elem.numero}</td>
                                        <td>{elem.nombre}</td>
                                        <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {elem.descripcion}
                                        </td>
                                        <td>{elem.orden}</td>
                                        <td className="actions-cell">
                                            {canWrite('Programas') && (
                                                <Link to={`/elementos/${elem.id}/edit`} className="btn-icon">
                                                    <Edit size={18} />
                                                </Link>
                                            )}
                                            {canExec('Programas') && (
                                                <button onClick={() => handleDelete(elem.id)} className="btn-icon danger">
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

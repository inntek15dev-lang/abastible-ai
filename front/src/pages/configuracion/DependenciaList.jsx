// IEEE Trace: REQ-001 | DependenciaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function DependenciaList() {
    const [dependencias, setDependencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const { canWrite, canExec } = useAuth();

    useEffect(() => {
        fetchDependencias();
    }, []);

    const fetchDependencias = async () => {
        try {
            const response = await api.get('/dependencias');
            setDependencias(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta dependencia?')) return;
        try {
            await api.delete(`/dependencias/${id}`);
            fetchDependencias();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Dependencias</h1>
                    <p className="text-secondary">Gestión de plantas y unidades territoriales.</p>
                </div>
                {canWrite('Programas') && ( // Reusing Programas privilege for now
                    <Link to="/dependencias/new" className="btn-primary">
                        <Plus size={18} /> Nueva Dependencia
                    </Link>
                )}
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dependencias.map(dep => (
                            <tr key={dep.id}>
                                <td>{dep.nombre}</td>
                                <td>
                                    <span className={`badge ${dep.activo ? 'success' : 'secondary'}`}>
                                        {dep.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div className="btn-icon-group">
                                        {canWrite('Programas') && (
                                            <Link to={`/dependencias/${dep.id}/edit`} className="btn-icon">
                                                <Edit size={18} />
                                            </Link>
                                        )}
                                        {canExec('Programas') && (
                                            <button onClick={() => handleDelete(dep.id)} className="btn-icon delete">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

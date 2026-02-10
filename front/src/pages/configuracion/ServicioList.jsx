// IEEE Trace: REQ-001 | ServicioList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ServicioList() {
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const { canWrite, canExec } = useAuth();

    useEffect(() => {
        fetchServicios();
    }, []);

    const fetchServicios = async () => {
        try {
            const response = await api.get('/servicios');
            setServicios(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este servicio?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            fetchServicios();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Servicios</h1>
                    <p className="text-secondary">Tipos de contratista agrupados por programa.</p>
                </div>
                {canWrite('Programas') && (
                    <Link to="/servicios/new" className="btn-primary">
                        <Plus size={18} /> Nuevo Servicio
                    </Link>
                )}
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Programa</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {servicios.map(serv => (
                            <tr key={serv.id}>
                                <td>{serv.nombre}</td>
                                <td>{serv.programa?.nombre || '-'}</td>
                                <td>{serv.descripcion}</td>
                                <td>
                                    <span className={`badge ${serv.activo ? 'success' : 'secondary'}`}>
                                        {serv.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div className="btn-icon-group">
                                        {canWrite('Programas') && (
                                            <Link to={`/servicios/${serv.id}/edit`} className="btn-icon">
                                                <Edit size={18} />
                                            </Link>
                                        )}
                                        {canExec('Programas') && (
                                            <button onClick={() => handleDelete(serv.id)} className="btn-icon delete">
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

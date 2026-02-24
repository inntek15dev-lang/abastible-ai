// IEEE Trace: REQ-001 | ServicioList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, Search, Tag, Briefcase, Users, Link2 } from 'lucide-react';

export default function ServicioList() {
    const [servicios, setServicios] = useState([]);
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const { canWrite, canExec } = useAuth();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPrograma, setFilterPrograma] = useState('');
    const [filterEstado, setFilterEstado] = useState('');

    useEffect(() => {
        fetchServicios();
        fetchProgramas();
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

    const fetchProgramas = async () => {
        try {
            const response = await api.get('/programas');
            setProgramas(response.data.data);
        } catch (error) {
            console.error('Error loading programas');
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

    // Filtered list
    const filtered = useMemo(() => {
        return servicios.filter(s => {
            const matchName = !searchTerm || s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchProg = !filterPrograma || String(s.programa_id) === filterPrograma;
            const matchEstado = filterEstado === '' || String(s.activo) === filterEstado;
            return matchName && matchProg && matchEstado;
        });
    }, [servicios, searchTerm, filterPrograma, filterEstado]);

    if (loading) return <div className="flex justify-center items-center min-h-screen bg-slate-50 text-slate-400">Cargando...</div>;

    return (
        <div className="service-page">
            {/* Header */}
            <header className="service-header">
                <div className="service-header-container">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2 rounded-lg">
                            <Tag className="text-indigo-600" size={20} />
                        </div>
                        <h1 className="service-title">
                            Catálogo de Servicios
                        </h1>
                    </div>
                    {canWrite('Programas') && (
                        <Link
                            to="/servicios/new"
                            className="btn-primary shadow-sm"
                        >
                            <Plus size={18} />
                            <span>Nuevo Servicio</span>
                        </Link>
                    )}
                </div>
            </header>

            <main className="service-main">
                {/* Search & Stats */}
                <div className="service-filters">
                    <div className="service-search-container">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="service-search-input"
                            placeholder="Buscar servicios..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-slate-500 font-medium">
                        Mostrando {filtered.length} servicios
                    </div>
                </div>

                {/* Services Grid/List */}
                <div className="service-grid">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-3">
                                <Search className="text-slate-400" size={24} />
                            </div>
                            <h3 className="text-slate-900 font-medium">No se encontraron resultados</h3>
                            <p className="text-slate-500 text-sm">Intenta ajustar tu búsqueda</p>
                        </div>
                    ) : (
                        filtered.map((serv) => (
                            <div
                                key={serv.id}
                                className="group service-card"
                            >
                                <div className="service-card-content">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="badge secondary">
                                            SRV-{String(serv.id).padStart(3, '0')}
                                        </span>
                                        {serv.activo ? (
                                            <span className="badge badge--green gap-1 flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="badge badge--gray">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="service-card-title truncate">
                                        {serv.nombre}
                                    </h3>

                                    <div className="service-meta">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={16} className="text-slate-400" />
                                            <span className="truncate max-w-[200px]" title={serv.programa?.nombre}>
                                                {serv.programa?.nombre || 'Sin Programa'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-slate-400" />
                                            <span>
                                                <strong className="text-slate-700 font-semibold">{serv.contratistas_count || 0}</strong> Contratistas
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link2 size={16} className="text-slate-400" />
                                            <span>
                                                <strong className="text-slate-700 font-semibold">{serv.vinculaciones_count || 0}</strong> Vinculaciones
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="service-actions">
                                    {canWrite('Programas') && (
                                        <Link
                                            to={`/servicios/${serv.id}/edit`}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                    )}

                                    {canExec('Programas') && (
                                        <button
                                            onClick={() => handleDelete(serv.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

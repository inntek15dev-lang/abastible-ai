// IEEE Trace: REQ-001 | ServicioList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

export default function ServicioList() {
    const [servicios, setServicios] = useState([]);
    const [programas, setProgramas] = useState([]);
    const [loading, setLoading] = useState(true);
    const { canWrite, canExec } = useAuth();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
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

    // Autocomplete suggestions
    const suggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        const term = searchTerm.toLowerCase();
        return servicios
            .filter(s => s.nombre.toLowerCase().includes(term))
            .slice(0, 8);
    }, [searchTerm, servicios]);

    // Filtered list
    const filtered = useMemo(() => {
        return servicios.filter(s => {
            const matchName = !searchTerm || s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchProg = !filterPrograma || String(s.programa_id) === filterPrograma;
            const matchEstado = filterEstado === '' || String(s.activo) === filterEstado;
            return matchName && matchProg && matchEstado;
        });
    }, [servicios, searchTerm, filterPrograma, filterEstado]);

    const clearFilters = () => {
        setSearchTerm('');
        setFilterPrograma('');
        setFilterEstado('');
    };

    const hasFilters = searchTerm || filterPrograma || filterEstado !== '';

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

            {/* Filters Bar */}
            <div style={{
                display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center',
                marginBottom: '1.5rem', padding: '1rem 1.25rem',
                background: 'var(--bg-card, #fff)', borderRadius: '10px',
                border: '1px solid var(--border-color, #e5e7eb)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                {/* Search by Name */}
                <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute', left: '10px', top: '50%',
                            transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none'
                        }} />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar servicio por nombre..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            style={{ paddingLeft: '34px' }}
                        />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                        <ul style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', listStyle: 'none',
                            margin: '4px 0 0', padding: '4px 0', maxHeight: '220px', overflowY: 'auto'
                        }}>
                            {suggestions.map(s => (
                                <li
                                    key={s.id}
                                    onMouseDown={() => { setSearchTerm(s.nombre); setShowSuggestions(false); }}
                                    style={{
                                        padding: '8px 14px', cursor: 'pointer',
                                        fontSize: '0.9rem', transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <strong>{s.nombre}</strong>
                                    <span style={{ color: '#6b7280', marginLeft: '8px', fontSize: '0.8rem' }}>
                                        {s.programa?.nombre || 'Sin programa'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Filter by Programa */}
                <select
                    className="form-control"
                    value={filterPrograma}
                    onChange={(e) => setFilterPrograma(e.target.value)}
                    style={{ flex: '0 1 220px', minWidth: '180px' }}
                >
                    <option value="">Todos los programas</option>
                    {programas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>

                {/* Filter by Estado */}
                <select
                    className="form-control"
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    style={{ flex: '0 1 160px', minWidth: '140px' }}
                >
                    <option value="">Todos los estados</option>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                </select>

                {/* Clear Filters */}
                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: 'none', border: '1px solid #d1d5db', borderRadius: '6px',
                            padding: '6px 12px', cursor: 'pointer', color: '#6b7280',
                            fontSize: '0.85rem', transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <X size={14} /> Limpiar
                    </button>
                )}

                <span style={{ color: '#9ca3af', fontSize: '0.85rem', marginLeft: 'auto' }}>
                    {filtered.length} de {servicios.length}
                </span>
            </div>

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
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                                    No se encontraron servicios con los filtros aplicados
                                </td>
                            </tr>
                        ) : (
                            filtered.map(serv => (
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

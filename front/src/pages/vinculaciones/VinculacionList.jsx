// IEEE Trace: REQ-009 | VinculacionList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Link2, Search, Plus, Trash2, Edit, Building, Briefcase, UserCheck, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function VinculacionList() {
    const [vinculaciones, setVinculaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user, canWrite, canExec } = useAuth();
    const isADC = user?.role === 'administrador_contrato';

    // Filters
    const [filterService, setFilterService] = useState('Todos');

    useEffect(() => {
        fetchVinculaciones();
    }, []);

    const fetchVinculaciones = async () => {
        try {
            const response = await api.get('/vinculaciones');
            setVinculaciones(response.data.data);
        } catch (error) {
            console.error('Error fetching vinculaciones:', error);
            toast.error('Error al cargar vinculaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta vinculación?')) return;
        try {
            await api.delete(`/vinculaciones/${id}`);
            toast.success('Vinculación eliminada');
            fetchVinculaciones();
        } catch (error) {
            toast.error('Error al eliminar vinculación');
        }
    };

    const uniqueServices = useMemo(() => {
        const services = new Set(vinculaciones.map(v => v.servicio?.nombre).filter(Boolean));
        return Array.from(services).sort();
    }, [vinculaciones]);

    const filteredData = useMemo(() => {
        return vinculaciones.filter(v => {
            const matchesSearch =
                v.contratista?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.contratista?.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.administraciones?.some(a => a.administradorContrato?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesService = filterService === 'Todos' || v.servicio?.nombre === filterService;

            return matchesSearch && matchesService;
        });
    }, [vinculaciones, searchTerm, filterService]);

    if (loading) return <div className="loading">Cargando vinculaciones...</div>;

    return (
        <div className="page-container">
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ color: 'var(--color-brand-secondary)', fontSize: '1.5rem', fontWeight: 600 }}>
                            <Link2 size={28} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Gestión de Vinculaciones
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                            Asignación de Servicios y Dependencias a Contratistas.
                        </p>
                    </div>

                </div>
            </header>

            {/* Filters */}
            <div className="filters-bar" style={{
                background: 'white', padding: '16px', borderRadius: '8px',
                border: '1px solid var(--border-color)', marginBottom: '20px',
                display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end'
            }}>
                <div className="form-group" style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                        Buscar (Contratista / Admin)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#9ca3af' }} />
                        <input
                            type="text"
                            className="form-control"
                            style={{ paddingLeft: 34 }}
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                        Servicio
                    </label>
                    <select
                        className="form-control"
                        value={filterService}
                        onChange={e => setFilterService(e.target.value)}
                    >
                        <option value="Todos">Todos</option>
                        {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <button
                    className="btn-secondary"
                    style={{ height: '42px', padding: '0 12px', background: 'white', border: '1px solid #d1d5db' }}
                    onClick={() => { setSearchTerm(''); setFilterService('Todos'); }}
                    title="Limpiar Filtros"
                >
                    <X size={18} color="#6b7280" />
                </button>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>CONTRATISTA</th>
                            <th>SERVICIO</th>
                            <th>DEPENDENCIA</th>
                            <th>N° CONTRATO</th>
                            <th>ADMIN. CONTRATO</th>
                            <th style={{ textAlign: 'center', width: '100px' }}>ESTADO</th>
                            <th style={{ textAlign: 'right', width: '100px' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-row" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                    No se encontraron vinculaciones.
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((v, idx) => (
                                <tr key={v.id}>
                                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{idx + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>{v.contratista?.nombre || '-'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{v.contratista?.rut}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge--blue">{v.servicio?.nombre || '-'}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building size={14} className="text-gray-400" />
                                            {v.dependencia?.nombre || '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                                            {v.numero_contrato || '-'}
                                        </div>
                                    </td>
                                    <td>
                                        {v.administraciones && v.administraciones.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {v.administraciones.map(admin => (
                                                    <div key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                                                        <UserCheck size={14} className="text-gray-400" />
                                                        {admin.administradorContrato?.name}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <span className="text-muted">-</span>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${v.activo ? 'badge--success' : 'badge--error'}`}>
                                            {v.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="flex justify-end gap-1">
                                            {canWrite('Vinculaciones') && !isADC && (
                                                <button className="btn-icon" title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                            {canExec('Vinculaciones') && !isADC && (
                                                <button onClick={() => handleDelete(v.id)} className="btn-icon danger" title="Eliminar">
                                                    <Trash2 size={16} />
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

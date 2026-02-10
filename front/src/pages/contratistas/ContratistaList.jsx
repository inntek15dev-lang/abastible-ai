// IEEE Trace: REQ-009 | US-051 | pages/contratistas/ContratistaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { Building, Search, Plus, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ContratistaList() {
    const [contratistas, setContratistas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { canWrite, canExec } = useAuth();

    useEffect(() => {
        fetchContratistas();
    }, []);

    const fetchContratistas = async () => {
        try {
            // Fetch users with role contratista_admin
            const response = await api.get('/usuarios?role=contratista_admin');
            setContratistas(response.data.data);
        } catch (err) {
            setError('Error al cargar contratistas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Está seguro de eliminar este contratista?')) return;
        try {
            await api.delete(`/contratistas/${id}`);
            fetchContratistas();
        } catch (err) {
            alert('Error al eliminar contratista');
        }
    };

    const filteredContratistas = contratistas.filter(c =>
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rut?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="loading">Cargando contratistas...</div>;

    return (
        <div className="page-container">
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ color: 'var(--color-brand-secondary)' }}>
                            <Building size={28} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Empresas Contratistas
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Gestión de empresas externas y sus dotaciones.
                        </p>
                    </div>
                    {canWrite('Configuración') && (
                        <Link to="/contratistas/new" className="btn-primary">
                            <Plus size={18} /> Nueva Empresa
                        </Link>
                    )}
                </div>
            </header>

            {/* Filters */}
            <div className="filters-bar" style={{ marginBottom: '20px', padding: '16px', display: 'flex' }}>
                <div className="form-group" style={{ flex: 1, maxWidth: '400px' }}>
                    <label><Search size={14} style={{ marginRight: 4 }} /> Buscar</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nombre empresa o RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Grid View */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredContratistas.map(c => (
                    <div key={c.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-secondary)' }}>
                                        {c.nombre || c.eecc_nombre}
                                    </h3>
                                    <span className="badge secondary" style={{ marginTop: '4px' }}>{c.rut || 'S/R'}</span>
                                </div>
                                <Building size={24} style={{ color: 'var(--color-brand-tertiary)', opacity: 0.5 }} />
                            </div>
                        </div>
                        <div style={{ padding: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <MapPin size={16} />
                                <span>{c.direccion || 'Sin dirección registrada'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Users size={16} />
                                <span>{c.dotacion_activa || 0} trabajadores activos</span>
                            </div>
                        </div>
                        <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            {canWrite('Configuración') && (
                                <>
                                    <Link to={`/contratistas/${c.id}`} className="btn-icon" title="Editar">
                                        <Edit size={16} />
                                    </Link>
                                    {canExec('Configuración') && (
                                        <button onClick={() => handleDelete(c.id)} className="btn-icon danger" title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredContratistas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No se encontraron empresas contratistas.
                </div>
            )}
        </div>
    );
}

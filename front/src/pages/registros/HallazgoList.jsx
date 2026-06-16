// IEEE Trace: REQ-003 | US-003, Sprint 2 | pages/registros/HallazgoList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
    AlertTriangle, Search, Filter, Calendar,
    Eye, CheckCircle, AlertCircle, Clock, Plus
} from 'lucide-react';

const SEVERIDAD_CONFIG = {
    critico: { color: 'var(--danger)', icon: AlertCircle, label: 'Crítico' },
    mayor: { color: 'var(--warning)', icon: AlertTriangle, label: 'Mayor' },
    menor: { color: 'var(--info)', icon: Clock, label: 'Menor' },
    observacion: { color: 'var(--text-secondary)', icon: Eye, label: 'Observación' }
};

const ESTADO_CONFIG = {
    abierto: { color: 'var(--warning)', label: 'Abierto' },
    en_proceso: { color: 'var(--info)', label: 'En Proceso' },
    cerrado: { color: 'var(--success)', label: 'Cerrado' }
};

export default function HallazgoList() {
    const [hallazgos, setHallazgos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec } = useAuth();

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        estado: 'all',
        tipo: 'all'
    });

    useEffect(() => {
        fetchHallazgos();
    }, []);

    const fetchHallazgos = async () => {
        try {
            const response = await api.get('/hallazgos');
            setHallazgos(response.data.data);
        } catch (err) {
            setError('Error al cargar hallazgos');
        } finally {
            setLoading(false);
        }
    };

    const filteredHallazgos = useMemo(() => {
        return hallazgos.filter(h => {
            const searchText = filters.search.toLowerCase();
            const matchesSearch = !searchText ||
                h.descripcion?.toLowerCase().includes(searchText) ||
                h.registro?.eecc_nombre?.toLowerCase().includes(searchText);

            const matchesEstado = filters.estado === 'all' || h.estado === filters.estado;
            const matchesTipo = filters.tipo === 'all' || h.tipo === filters.tipo;

            return matchesSearch && matchesEstado && matchesTipo;
        });
    }, [hallazgos, filters]);

    const handleCerrar = async (id) => {
        if (!confirm('¿Confirma cerrar este hallazgo?')) return;
        try {
            await api.put(`/hallazgos/${id}`, { estado: 'cerrado' });
            fetchHallazgos();
        } catch (err) {
            alert('Error al cerrar hallazgo');
        }
    };

    if (loading) return <div className="loading">Cargando hallazgos...</div>;

    return (
        <div className="page-container">
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ color: 'var(--color-brand-secondary)' }}>
                            <AlertTriangle size={28} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Hallazgos de Auditoría
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Gestión de observaciones y no conformidades detectadas en auditorías.
                        </p>
                    </div>
                </div>
            </header>

            {/* Filters Bar */}
            <div className="filters-bar" style={{
                background: 'white', padding: '16px', borderRadius: '8px',
                border: '1px solid var(--border-color)', marginBottom: '20px',
                display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end'
            }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label><Search size={14} style={{ marginRight: 4 }} /> Buscar</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Descripción o empresa..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="form-group" style={{ width: '160px' }}>
                    <label><Filter size={14} style={{ marginRight: 4 }} /> Estado</label>
                    <select
                        className="form-control"
                        value={filters.estado}
                        onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                    >
                        <option value="all">Todos</option>
                        <option value="abierto">Abierto</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="cerrado">Cerrado</option>
                    </select>
                </div>

                <div className="form-group" style={{ width: '160px' }}>
                    <label>Severidad</label>
                    <select
                        className="form-control"
                        value={filters.tipo}
                        onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                    >
                        <option value="all">Todas</option>
                        <option value="critico">Crítico</option>
                        <option value="mayor">Mayor</option>
                        <option value="menor">Menor</option>
                        <option value="observacion">Observación</option>
                    </select>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Stats Summary */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px', marginBottom: '20px'
            }}>
                <div className="stat-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
                        {hallazgos.filter(h => h.estado === 'abierto').length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Abiertos</div>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>
                        {hallazgos.filter(h => h.estado === 'en_proceso').length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>En Proceso</div>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                        {hallazgos.filter(h => h.estado === 'cerrado').length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cerrados</div>
                </div>
            </div>

            {/* Data Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Registro</th>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHallazgos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-row">No se encontraron hallazgos.</td>
                            </tr>
                        ) : (
                            filteredHallazgos.map((h) => {
                                const tipoConfig = SEVERIDAD_CONFIG[h.tipo] || SEVERIDAD_CONFIG.observacion;
                                const estadoConfig = ESTADO_CONFIG[h.estado] || ESTADO_CONFIG.abierto;
                                const TipoIcon = tipoConfig.icon;

                                return (
                                    <tr key={h.id}>
                                        <td style={{ fontFamily: 'monospace' }}>#{h.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{h.registro?.eecc_nombre || '-'}</div>
                                            <small style={{ color: 'var(--text-secondary)' }}>
                                                {h.registro?.periodo || ''}
                                            </small>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                padding: '4px 10px', borderRadius: '4px',
                                                background: tipoConfig.color + '20', color: tipoConfig.color,
                                                fontSize: '0.8rem', fontWeight: 500
                                            }}>
                                                <TipoIcon size={14} />
                                                {tipoConfig.label}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }} title={h.descripcion}>
                                                {h.descripcion}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge`} style={{
                                                background: estadoConfig.color + '20',
                                                color: estadoConfig.color
                                            }}>
                                                {estadoConfig.label}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {new Date(h.created_at).toLocaleDateString('es-CL')}
                                        </td>
                                        <td className="actions-cell">
                                            <div className="btn-icon-group">
                                                <Link to={`/compromisos?hallazgo=${h.id}`} className="btn-icon" title="Ver Compromisos">
                                                    <Eye size={16} />
                                                </Link>
                                                {h.estado !== 'cerrado' && canWrite('Auditoria') && (
                                                    <button
                                                        onClick={() => handleCerrar(h.id)}
                                                        className="btn-action"
                                                        style={{ background: 'var(--success)', color: 'white' }}
                                                        title="Cerrar Hallazgo"
                                                    >
                                                        <CheckCircle size={14} /> Cerrar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Mostrando {filteredHallazgos.length} de {hallazgos.length} hallazgos
            </div>
        </div>
    );
}

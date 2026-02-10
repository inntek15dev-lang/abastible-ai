// IEEE Trace: REQ-005 | US-005, US-051 | pages/registros/EvidenciaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { FileText, Search, Filter, Eye, Download, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EvidenciaList() {
    const [evidencias, setEvidencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '' });

    useEffect(() => {
        fetchEvidencias();
    }, []);

    const fetchEvidencias = async () => {
        try {
            const response = await api.get('/evidencias');
            // Ajustar segun respuesta real, asumo data.data como estandar
            setEvidencias(response.data.data || []);
        } catch (err) {
            setError('Error al cargar evidencias');
        } finally {
            setLoading(false);
        }
    };

    const filteredEvidencias = evidencias.filter(e =>
        e.descripcion?.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.registro?.eecc_nombre?.toLowerCase().includes(filters.search.toLowerCase())
    );

    if (loading) return <div className="loading">Cargando evidencias...</div>;

    return (
        <div className="page-container">
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ color: 'var(--color-brand-secondary)' }}>
                            <FileText size={28} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Evidencias de Auditoría
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Repositorio centralizado de evidencias obligatorias y respaldos.
                        </p>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="filters-bar" style={{ marginBottom: '20px', padding: '16px', display: 'flex' }}>
                <div className="form-group" style={{ flex: 1, maxWidth: '400px' }}>
                    <label><Search size={14} style={{ marginRight: 4 }} /> Buscar</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Descripción, archivo o empresa..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Registro / Empresa</th>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Archivo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvidencias.length === 0 ? (
                            <tr><td colSpan={6} className="empty-row">No hay evidencias registradas.</td></tr>
                        ) : (
                            filteredEvidencias.map(e => (
                                <tr key={e.id}>
                                    <td>{new Date(e.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{e.registro?.eecc_nombre || '-'}</div>
                                        <small style={{ color: 'var(--text-secondary)' }}>{e.registro?.periodo}</small>
                                    </td>
                                    <td><span className="badge info">{e.tipo || 'General'}</span></td>
                                    <td>{e.descripcion}</td>
                                    <td>{e.nombre_archivo}</td>
                                    <td className="actions-cell">
                                        <div className="btn-icon-group">
                                            <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Ver / Descargar">
                                                <Download size={16} />
                                            </a>
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

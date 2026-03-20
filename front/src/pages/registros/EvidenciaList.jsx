// IEEE Trace: REQ-005 | US-005, US-051 | pages/registros/EvidenciaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { FileText, Search, Filter, Eye, Download, CreditCard, Building, Calendar, FolderOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function EvidenciaList() {
    const [evidencias, setEvidencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ 
        search: '',
        periodo: '',
        contratista_id: '',
        programa_id: ''
    });

    // Options for filters
    const [programas, setProgramas] = useState([]);
    const [contratistas, setContratistas] = useState([]);

    useEffect(() => {
        fetchInitialData();
        fetchEvidencias();
    }, [filters.periodo, filters.contratista_id, filters.programa_id]);

    const fetchInitialData = async () => {
        try {
            const [progRes, contRes] = await Promise.all([
                api.get('/programas'),
                api.get('/contratistas')
            ]);
            setProgramas(progRes.data.data || []);
            setContratistas(contRes.data.data || []);
        } catch (err) {
            console.error('Error loading filters:', err);
        }
    };

    const fetchEvidencias = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.periodo) params.periodo = filters.periodo;
            if (filters.contratista_id) params.contratista_id = filters.contratista_id;
            if (filters.programa_id) params.programa_id = filters.programa_id;

            const response = await api.get('/evidencias', { params });
            setEvidencias(response.data.data || []);
        } catch (err) {
            setError('Error al cargar evidencias');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDownload = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.periodo) params.append('periodo', filters.periodo);
            if (filters.contratista_id) params.append('contratista_id', filters.contratista_id);
            if (filters.programa_id) params.append('programa_id', filters.programa_id);

            const downloadUrl = `${api.defaults.baseURL}/evidencias/bulk-download?${params.toString()}`;
            
            // To handle token if needed we'd use axios blob, but let's try direct link first
            // If API requires auth header (it does), we'll use a hidden link or fetch.
            // Using a fetch-based approach for auth:
            const response = await api.get(`/evidencias/bulk-download?${params.toString()}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `evidencias_${filters.periodo || 'periodo'}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Descarga masiva iniciada');
        } catch (err) {
            console.error('Download error:', err);
            toast.error(err.response?.data?.message || 'Error al generar descarga');
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
            <div className="filters-bar" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label><Search size={14} style={{ marginRight: 4 }} /> Buscar</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Descripción o archivo..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="form-group" style={{ width: '150px' }}>
                    <label><Calendar size={14} style={{ marginRight: 4 }} /> Periodo</label>
                    <input
                        type="month"
                        className="form-control"
                        value={filters.periodo}
                        onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
                    />
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label><Building size={14} style={{ marginRight: 4 }} /> Contratista</label>
                    <select
                        className="form-control"
                        value={filters.contratista_id}
                        onChange={(e) => setFilters({ ...filters, contratista_id: e.target.value })}
                    >
                        <option value="">Todas las empresas</option>
                        {contratistas.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label><FolderOpen size={14} style={{ marginRight: 4 }} /> Programa</label>
                    <select
                        className="form-control"
                        value={filters.programa_id}
                        onChange={(e) => setFilters({ ...filters, programa_id: e.target.value })}
                    >
                        <option value="">Todos los programas</option>
                        {programas.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>

                <button 
                    className="btn primary" 
                    onClick={handleBulkDownload}
                    style={{ marginBottom: '0', display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
                >
                    <Download size={18} />
                    Descarga Masiva (ZIP)
                </button>
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

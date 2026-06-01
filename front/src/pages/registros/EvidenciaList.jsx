// IEEE Trace: REQ-005 | US-005, US-051 | pages/registros/EvidenciaList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { FileText, Search, Filter, Eye, Download, CreditCard, Building, Calendar, FolderOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function EvidenciaList() {
    const { user } = useAuth();
    const [evidencias, setEvidencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ 
        search: '',
        periodo: '',
        contratista_id: '',
        programa_id: '',
        elemento_id: '',
        actividad_id: ''
    });

    // Options for filters
    const [programas, setProgramas] = useState([]);
    const [contratistas, setContratistas] = useState([]);
    const [elementos, setElementos] = useState([]);
    const [actividades, setActividades] = useState([]);
    const [contratistaInput, setContratistaInput] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchEvidencias();
    }, [filters.periodo, filters.contratista_id, filters.programa_id, filters.elemento_id, filters.actividad_id]);

    useEffect(() => {
        if (filters.programa_id) {
            fetchElementos(filters.programa_id);
        } else {
            setElementos([]);
            setFilters(prev => ({ ...prev, elemento_id: '', actividad_id: '' }));
        }
    }, [filters.programa_id]);

    useEffect(() => {
        if (filters.elemento_id) {
            fetchActividades(filters.elemento_id);
        } else {
            setActividades([]);
            setFilters(prev => ({ ...prev, actividad_id: '' }));
        }
    }, [filters.elemento_id]);

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

    const fetchElementos = async (programaId) => {
        try {
            const res = await api.get(`/elementos?programa_id=${programaId}`);
            setElementos(res.data.data || []);
        } catch (err) {
            console.error('Error fetching elements:', err);
        }
    };

    const fetchActividades = async (elementoId) => {
        try {
            // Wait, we need the element full object or just hit /actividades?elemento_id=X
            // Assuming /actividades endpoint exists or /elementos/:id/actividades
            // Let's check /actividades first.
            const res = await api.get(`/actividades?elemento_id=${elementoId}`);
            setActividades(res.data.data || []);
        } catch (err) {
            console.error('Error fetching activities:', err);
        }
    };

    const fetchEvidencias = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.periodo) params.periodo = filters.periodo;
            if (filters.contratista_id) params.contratista_id = filters.contratista_id;
            if (filters.programa_id) params.programa_id = filters.programa_id;
            if (filters.elemento_id) params.elemento_id = filters.elemento_id;
            if (filters.actividad_id) params.actividad_id = filters.actividad_id;
            
            if (user?.role === 'administrador_contrato') {
                params.status_filter = 'pending';
            }

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
            if (filters.elemento_id) params.append('elemento_id', filters.elemento_id);
            if (filters.actividad_id) params.append('actividad_id', filters.actividad_id);

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

    const handleClearFilters = () => {
        setFilters({
            search: '',
            periodo: '',
            contratista_id: '',
            programa_id: '',
            elemento_id: '',
            actividad_id: ''
        });
        setContratistaInput('');
    };

    const filteredEvidencias = evidencias.filter(e =>
        e.descripcion?.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.registro?.eecc_nombre?.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.nombre_archivo?.toLowerCase().includes(filters.search.toLowerCase())
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
            <div className="filters-bar" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label><Search size={14} style={{ marginRight: 4 }} /> Buscar</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Descripción, archivo o empresa..."
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
                    <label><Building size={14} style={{ marginRight: 4 }} /> Empresa (EECC)</label>
                    <input
                        list="contratistas-list"
                        className="form-control"
                        placeholder="Buscar empresa..."
                        value={contratistaInput}
                        onChange={(e) => {
                            const val = e.target.value;
                            setContratistaInput(val);
                            const match = contratistas.find(c => c.nombre === val);
                            if (match) {
                                setFilters(f => ({ ...filters, contratista_id: match.id }));
                            } else if (val === '') {
                                setFilters(f => ({ ...filters, contratista_id: '' }));
                            }
                        }}
                    />
                    <datalist id="contratistas-list">
                        {contratistas.map(c => <option key={c.id} value={c.nombre} />)}
                    </datalist>
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label><FolderOpen size={14} style={{ marginRight: 4 }} /> Programa</label>
                    <select
                        className="form-control"
                        value={filters.programa_id}
                        onChange={(e) => setFilters({ ...filters, programa_id: e.target.value, elemento_id: '', actividad_id: '' })}
                    >
                        <option value="">Todos los programas</option>
                        {programas.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label><Filter size={14} style={{ marginRight: 4 }} /> Elemento</label>
                    <select
                        className="form-control"
                        value={filters.elemento_id}
                        onChange={(e) => setFilters({ ...filters, elemento_id: e.target.value, actividad_id: '' })}
                        disabled={!filters.programa_id}
                    >
                        <option value="">Todos los elementos</option>
                        {elementos.map(el => (
                            <option key={el.id} value={el.id}>E{el.numero}: {el.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label><Filter size={14} style={{ marginRight: 4 }} /> Actividad</label>
                    <select
                        className="form-control"
                        value={filters.actividad_id}
                        onChange={(e) => setFilters({ ...filters, actividad_id: e.target.value })}
                        disabled={!filters.elemento_id}
                    >
                        <option value="">Todas las actividades</option>
                        {actividades.map(act => (
                            <option key={act.id} value={act.id}>{act.codigo}: {act.nombre.substring(0, 30)}...</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        className="btn" 
                        onClick={handleClearFilters}
                        style={{ marginBottom: '0', height: '38px', backgroundColor: '#f3f4f6', color: '#374151' }}
                    >
                        Limpiar
                    </button>
                    <button 
                        className="btn primary" 
                        onClick={handleBulkDownload}
                        disabled={loading}
                        style={{ marginBottom: '0', display: 'flex', alignItems: 'center', gap: '8px', height: '38px' }}
                    >
                        <Download size={18} />
                        Descarga ZIP
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Elemento / Actividad</th>
                            <th>EECC / Periodo</th>
                            <th>Descripción</th>
                            <th>Archivo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvidencias.length === 0 ? (
                            <tr><td colSpan={6} className="empty-row">No hay evidencias que coincidan con los filtros.</td></tr>
                        ) : (
                            filteredEvidencias.map(e => (
                                <tr key={e.id}>
                                    <td>
                                        <div style={{ fontSize: '0.8rem' }}>{new Date(e.created_at).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--color-brand-secondary)', fontSize: '0.85rem' }}>
                                            {e.registroActividad?.actividad?.elemento?.nombre || '-'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                                            {e.registroActividad?.actividad?.codigo}: {e.registroActividad?.actividad?.nombre}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{e.registroActividad?.registro?.eecc_nombre || '-'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                                            <Calendar size={12} /> {e.registroActividad?.registro?.periodo}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>
                                        {e.descripcion || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin descripción</span>}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FileText size={14} /> {e.nombre_archivo.length > 20 ? e.nombre_archivo.substring(0, 20) + '...' : e.nombre_archivo}
                                        </div>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="btn-icon-group">
                                            <a 
                                                href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${e.ruta}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="btn-icon" 
                                                title="Ver / Descargar"
                                                style={{ color: 'var(--color-brand-primary)' }}
                                            >
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

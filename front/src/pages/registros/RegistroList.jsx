// IEEE Trace: REQ-002 | US-002, US-050 | pages/registros/RegistroList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
    Plus, Eye, Edit, Edit2, RefreshCw, Trash2, FileText,
    Search, Filter, Calendar, Building, List
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import TraceabilityPanel from '../../components/TraceabilityPanel';
import SolicitudReaperturaModal from '../../components/forms/SolicitudReaperturaModal';

// --- Tab Navigation Component (from Skin) ---
const TabNav = ({ activeTab, onTabChange }) => (
    <div className="nav-tabs" style={{ marginBottom: '20px' }}>
        <button
            className={`nav-tab nav-tab--primary ${activeTab === 'resumen' ? 'active' : ''}`}
            onClick={() => onTabChange('resumen')}
            style={{ opacity: activeTab === 'resumen' ? 1 : 0.6 }}
        >
            Resumen
        </button>
        <button
            className={`nav-tab nav-tab--orange ${activeTab === 'operaciones' ? 'active' : ''}`}
            onClick={() => onTabChange('operaciones')}
            style={{
                background: activeTab === 'operaciones' ? 'var(--color-brand-primary)' : '#fff3e0',
                color: activeTab === 'operaciones' ? 'white' : 'var(--color-brand-primary)',
            }}
        >
            Operaciones
        </button>
        <button
            className={`nav-tab nav-tab--green ${activeTab === 'personas' ? 'active' : ''}`}
            onClick={() => onTabChange('personas')}
            style={{ opacity: activeTab === 'personas' ? 1 : 0.6 }}
        >
            Personas
        </button>
    </div>
);

export default function RegistroList() {
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec, user } = useAuth();
    const [activeTab, setActiveTab] = useState('operaciones');
    const [tracePanelOpen, setTracePanelOpen] = useState(false);
    const [selectedRegistroId, setSelectedRegistroId] = useState(null);

    // Reapertura Modal State
    const [reaperturaModal, setReaperturaModal] = useState(false);

    // Advanced Filters State (US-050)
    const [filters, setFilters] = useState({
        search: '',
        period: '',
        status: 'all',
    });

    useEffect(() => {
        fetchRegistros();
    }, []);

    const fetchRegistros = async () => {
        try {
            const response = await api.get('/registros');
            setRegistros(response.data.data);
        } catch (err) {
            setError('Error al cargar registros');
        } finally {
            setLoading(false);
        }
    };

    // --- Computed Filtered Data ---
    const filteredRegistros = useMemo(() => {
        return registros.filter(reg => {
            // Text Search (Contractor Name or RUT)
            const searchText = filters.search.toLowerCase();
            const contractorName = (reg.eecc_nombre || reg.usuario?.eecc_nombre || '').toLowerCase();
            const contractorRut = (reg.usuario?.rut || '').toLowerCase(); // Now available from backend
            const matchesSearch = !searchText || contractorName.includes(searchText) || contractorRut.includes(searchText);

            // Status Filter
            const matchesStatus = filters.status === 'all' || reg.estado_auditoria === filters.status;

            // Period Filter (Text match YYYY-MM for simplicity)
            const matchesPeriod = !filters.period || reg.periodo.startsWith(filters.period);

            // Tab Filter (Simulated for Demo)
            // In a real app, this might fetch specific endpoints. Here we just filter contextually.
            // Operaciones = All Records
            // Resumen = Summary (Not implemented in list view)
            // Personas = Filtering records related to HR/People (Simulated)
            const matchesTab = true; // Placeholder for tab logic

            return matchesSearch && matchesStatus && matchesPeriod && matchesTab;
        });
    }, [registros, filters, activeTab]);

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedRegistros = useMemo(() => {
        let sortableItems = [...filteredRegistros];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle nested properties (e.g. usuario.eecc_nombre)
                if (sortConfig.key === 'eecc_nombre') {
                    aValue = a.eecc_nombre || a.usuario?.eecc_nombre || '';
                    bValue = b.eecc_nombre || b.usuario?.eecc_nombre || '';
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredRegistros, sortConfig]);

    const openReaperturaModal = (registroId) => {
        setSelectedRegistroId(registroId);
        setReaperturaModal(true);
    };

    // --- PDF Generation Action ---
    const generatePDF = (registro) => {
        const doc = new jsPDF();
        doc.text('Reporte de Cumplimiento', 14, 15);

        autoTable(doc, {
            head: [['Campo', 'Valor']],
            body: [
                ['Empresa', registro.eecc_nombre || registro.usuario?.eecc_nombre],
                ['Dependencia', registro.dependencia],
                ['Periodo', registro.periodo],
                ['Cumplimiento', `${registro.porcentaje_cumplimiento}%`],
                ['Estado', registro.estado_auditoria],
            ],
            startY: 25,
        });

        doc.save(`reporte_${registro.id}.pdf`);
    };

    const getEstadoBadgeClass = (estado) => {
        const map = {
            pendiente: 'warning',
            auditando: 'info',
            auditada_terreno: 'success',
            auditada_sistema: 'success',
            reabierto: 'danger'
        };
        return `badge ${map[estado] || 'secondary'}`;
    };

    if (loading) return <div className="loading">Cargando datos...</div>;

    return (
        <div className="page-container">
            {/* Header Section */}
            <header className="page-header" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ color: 'var(--color-brand-secondary)' }}>Gestión de Registros</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Monitoreo y auditoría de cumplimiento mensual de contratistas.
                        </p>
                    </div>
                    {canWrite('Registros') && (
                        <Link to="/registros/new" id="btn-nuevo-registro" className="btn-primary">
                            <Plus size={18} /> Nuevo Registro
                        </Link>
                    )}
                </div>
            </header>

            {/* Skin Tabs */}
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Filters Bar (US-050) */}
            <div className="filters-bar" style={{
                background: 'white', padding: '16px', borderRadius: '8px',
                border: '1px solid var(--border-color)', marginBottom: '20px',
                display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end'
            }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label htmlFor="filter-search"><Search size={14} style={{ marginRight: 4 }} /> Buscar Empresa / RUT</label>
                    <input
                        id="filter-search"
                        type="text"
                        className="form-control"
                        placeholder="Ej: Constructora, 76.123..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        style={{ width: '100%' }}
                    />
                </div>

                <div className="form-group" style={{ width: '180px' }}>
                    <label htmlFor="filter-period"><Calendar size={14} style={{ marginRight: 4 }} /> Periodo</label>
                    <input
                        id="filter-period"
                        type="month"
                        className="form-control"
                        value={filters.period}
                        onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                    />
                </div>

                <div className="form-group" style={{ width: '200px' }}>
                    <label htmlFor="filter-status"><Filter size={14} style={{ marginRight: 4 }} /> Estado Auditoría</label>
                    <select
                        id="filter-status"
                        className="form-control"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="all">Todo los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="auditando">Auditando</option>
                        <option value="auditada_sistema">Auditada (Sistema)</option>
                        <option value="auditada_terreno">Auditada (Terreno)</option>
                        <option value="reabierto">Reabierto</option>
                    </select>
                </div>

                {/* Reset Filters button could go here */}
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Data Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>Periodo {sortConfig.key === 'periodo' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('eecc_nombre')} style={{ cursor: 'pointer' }}>Contratista {sortConfig.key === 'eecc_nombre' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th>RUT</th>
                            <th onClick={() => handleSort('dependencia')} style={{ cursor: 'pointer' }}>Dependencia {sortConfig.key === 'dependencia' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('dotacion_total')} style={{ cursor: 'pointer' }}>Dotación {sortConfig.key === 'dotacion_total' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('porcentaje_cumplimiento')} style={{ cursor: 'pointer' }}>% Cumpl. {sortConfig.key === 'porcentaje_cumplimiento' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('estado_auditoria')} style={{ cursor: 'pointer' }}>Estado {sortConfig.key === 'estado_auditoria' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRegistros.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="empty-row">No se encontraron registros coincidentes.</td>
                            </tr>
                        ) : (
                            sortedRegistros.map((registro) => (
                                <tr key={registro.id} data-status={registro.estado_auditoria}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>
                                            {new Date(registro.periodo).toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)' }}>
                                            Enviado: {new Date(registro.created_at).toLocaleDateString()}
                                        </small>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--color-brand-secondary)' }}>
                                            {registro.eecc_nombre || registro.usuario?.eecc_nombre || '-'}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                        {registro.usuario?.rut || '-'}
                                    </td>
                                    <td>{registro.dependencia || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {registro.dotacion_total || 0}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    backgroundColor: Number(registro.porcentaje_cumplimiento) >= 90 ? '#10b981' :
                                                        Number(registro.porcentaje_cumplimiento) >= 70 ? '#f59e0b' : '#ef4444'
                                                }}
                                                title={
                                                    Number(registro.porcentaje_cumplimiento) >= 90 ? 'Cumplimiento Óptimo' :
                                                        Number(registro.porcentaje_cumplimiento) >= 70 ? 'Atención Requerida' : 'Crítico'
                                                }
                                            />
                                            <span style={{ fontWeight: 600 }}>{registro.porcentaje_cumplimiento}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={getEstadoBadgeClass(registro.estado_auditoria)}>
                                            {registro.estado_auditoria.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="btn-icon-group">
                                            {/* Action: Audit/View */}
                                            {(registro.estado_auditoria === 'pendiente' || registro.estado_auditoria === 'reabierto') ? (
                                                <Link to={`/registros/${registro.id}`} className="btn-icon tutorial-btn-editar" title="Editar Registro">
                                                    <Edit2 size={16} />
                                                </Link>
                                            ) : (
                                                <Link to={`/registros/${registro.id}`} className="btn-icon" title="Ver Detalle">
                                                    <Eye size={18} />
                                                </Link>
                                            )}

                                            {/* Action: PDF */}
                                            {canExec('Registros_Exportar') && (
                                                <button onClick={() => generatePDF(registro)} className="btn-action btn-pdf" title="Descargar PDF">
                                                    <FileText size={14} /> PDF
                                                </button>
                                            )}

                                            {/* Action: Traceability (US-052) */}
                                            <button
                                                onClick={() => {
                                                    setSelectedRegistroId(registro.id);
                                                    setTracePanelOpen(true);
                                                }}
                                                className="btn-action btn-traza"
                                                title="Ver Trazabilidad"
                                            >
                                                <List size={14} /> Traza
                                            </button>

                                            {/* Action: Reapertura (US-004) */}
                                            {/* Show only if in auditado/cerrado state and not already reabierto */}
                                            {['auditada_sistema', 'auditada_terreno', 'cerrado'].includes(registro.estado_auditoria) && (
                                                <button
                                                    onClick={() => openReaperturaModal(registro.id)}
                                                    className="btn-action btn-pdf tutorial-btn-reabrir" // Reusing style for now
                                                    title="Solicitar Reapertura"
                                                    style={{ color: 'var(--color-brand-primary)' }}
                                                >
                                                    <RefreshCw size={14} /> Reabrir
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

            <div style={{ marginTop: '20px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Mostrando {filteredRegistros.length} de {registros.length} registros
            </div>

            {/* Traceability Panel Integration */}
            <TraceabilityPanel
                isOpen={tracePanelOpen}
                onClose={() => setTracePanelOpen(false)}
                registroId={selectedRegistroId}
            />

            {/* Reapertura Modal */}
            {reaperturaModal && (
                <SolicitudReaperturaModal
                    registroId={selectedRegistroId}
                    onClose={() => setReaperturaModal(false)}
                    onSuccess={() => {
                        alert('Solicitud enviada correctamente');
                        fetchRegistros();
                    }}
                />
            )}
        </div>
    );
}

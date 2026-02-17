// IEEE Trace: REQ-002 | US-002, US-050 | pages/registros/RegistroList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
    Plus, Eye, Edit, Edit2, RefreshCw, Trash2, FileText,
    Search, Filter, Calendar, Building, List, ClipboardCheck, Monitor, X, Lock
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import TraceabilityPanel from '../../components/TraceabilityPanel';
import SolicitudReaperturaModal from '../../components/forms/SolicitudReaperturaModal';
import PendingRegistersWidget from '../../components/widgets/PendingRegistersWidget';

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
    const { canWrite, canExec, user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('operaciones');
    const [tracePanelOpen, setTracePanelOpen] = useState(false);
    const [selectedRegistroId, setSelectedRegistroId] = useState(null);

    // Reapertura Modal State
    const [reaperturaModal, setReaperturaModal] = useState(false);

    // Resource States
    const [dependencies, setDependencies] = useState([]);
    const [services, setServices] = useState([]); // Tipos de Contratista
    const [programs, setPrograms] = useState([]);
    const [admins, setAdmins] = useState([]);

    // Advanced Filters State (US-050)
    const [filters, setFilters] = useState({
        search: '',
        period: '',
        status: 'all',
        servicio: 'Todos',
        dependencia: 'Todas',
        programa: 'Todos',
        auditoria: 'Todos',
        admin_contrato: 'Todos'
    });

    useEffect(() => {
        fetchRegistros();
        fetchResources();
    }, []);

    const fetchDependencies = async (servicio = 'Todos') => {
        try {
            const url = servicio && servicio !== 'Todos'
                ? `/resources/dependencias?servicio=${encodeURIComponent(servicio)}`
                : '/resources/dependencias';
            const response = await api.get(url);
            setDependencies(response.data.data);
        } catch (err) {
            console.error("Error fetching dependencies", err);
        }
    };

    const fetchResources = async () => {
        try {
            const [servRes, progRes, userRes] = await Promise.all([
                api.get('/resources/tipos-contratista'),
                api.get('/programas'),
                api.get('/usuarios?role=administrador_contrato')
            ]);
            setServices(servRes.data.data);
            setPrograms(progRes.data.data);
            setAdmins(userRes.data.data);

            // Initial load of all dependencies
            await fetchDependencies();
        } catch (err) {
            console.error("Error fetching filter resources", err);
        }
    };

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

    // --- Special Logic for Pending Registers Widget (Contractor User) ---
    const [myVinculacion, setMyVinculacion] = useState(null);

    useEffect(() => {
        const fetchMyVinculacion = async () => {
            // Only for contratista_user who has specific scope
            if (user?.role === 'contratista_user' && user.contratista_id && user.tipo_contratista_id && user.dependencia_id) {
                try {
                    const res = await api.get('/vinculaciones', {
                        params: {
                            contratista_id: user.contratista_id,
                            servicio_id: user.tipo_contratista_id,
                            dependencia_id: user.dependencia_id
                        }
                    });
                    if (res.data.data && res.data.data.length > 0) {
                        setMyVinculacion(res.data.data[0]);
                    }
                } catch (err) {
                    console.error("Error fetching my vinculacion for widget", err);
                }
            }
        };
        fetchMyVinculacion();
    }, [user]);

    // --- Computed Filtered Data ---
    const filteredRegistros = useMemo(() => {
        return registros.filter(reg => {
            // Text Search
            const searchText = filters.search.toLowerCase();
            const contractorName = (reg.eecc_nombre || reg.usuario?.eecc_nombre || '').toLowerCase();
            const contractorRut = (reg.usuario?.rut || '').toLowerCase();
            const matchesSearch = !searchText || contractorName.includes(searchText) || contractorRut.includes(searchText);

            // Dynamic Filters
            const regService = reg.asignacion?.tipoContratista?.nombre || (reg.vinculacionEntidad?.servicio?.nombre) || 'GRANEL';
            const matchesService = !filters.servicio || filters.servicio === 'Todos' || regService === filters.servicio;

            const matchesDependency = !filters.dependencia || filters.dependencia === 'Todas' ||
                reg.dependencia === filters.dependencia || (reg.vinculacionEntidad?.dependencia?.nombre === filters.dependencia);

            const regProgram = reg.programa?.nombre || 'Sin Programa';
            const matchesProgram = !filters.programa || filters.programa === 'Todos' || regProgram === filters.programa;

            const matchesStatus = filters.status === 'all' || reg.estado_auditoria === filters.status;
            const matchesPeriod = !filters.period || reg.periodo.startsWith(filters.period);

            const adminsInVinc = reg.vinculacionEntidad?.administraciones?.map(a => a.administrador_contrato_id.toString()) || [];
            const matchesAdmin = !filters.admin_contrato || filters.admin_contrato === 'Todos' || adminsInVinc.includes(filters.admin_contrato);

            return matchesSearch && matchesStatus && matchesPeriod && matchesService && matchesDependency && matchesProgram && matchesAdmin;
        });
    }, [registros, filters]);

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

    const isContractor = ['contratista_admin', 'contratista_user'].includes(user?.role);
    const isAdminOrADC = isAdmin || user?.role === 'administrador_contrato';

    const handleReabrirDirecto = async (registroId) => {
        if (!window.confirm('¿Está seguro de reabrir este registro?')) return;
        try {
            await api.post('/reaperturas/directa', { registro_id: registroId });
            alert('Registro reabierto exitosamente');
            fetchRegistros();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al reabrir registro');
        }
    };

    const handleDelete = async (registroId) => {
        if (!window.confirm('ADVERTENCIA: ¿Está seguro de eliminar este registro permanentemente?\n\nEsta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/registros/${registroId}`);
            alert('Registro eliminado exitosamente');
            fetchRegistros();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al eliminar el registro');
        }
    };

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

    const getPorcentajeBadgeClass = (score) => {
        const num = Number(score);
        if (num >= 90) return 'badge--percent-high';
        if (num >= 70) return 'badge--percent-mid';
        return 'badge--percent-low';
    };

    if (loading) return <div className="loading">Cargando datos...</div>;

    return (
        <div className="page-container">
            {/* Header with Title and Add Button */}
            <header className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-brand-secondary)' }}>
                    Registros de Cumplimiento
                </h1>
                {canWrite('Registros') && (
                    <Link to="/registros/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <Plus size={18} /> Nuevo Registro
                    </Link>
                )}
            </header>

            {/* Filters Bar (Mockup Style) */}
            <div className="filters-bar" style={{
                background: 'white', padding: '16px', borderRadius: '8px',
                border: '1px solid var(--border-color)', marginBottom: '20px',
                display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end'
            }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>Contratista / RUT</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre o RUT..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>


                <div className="form-group" style={{ width: '150px' }}>
                    <label>Servicio</label>
                    <select className="form-control" value={filters.servicio || 'Todos'}
                        onChange={e => {
                            const val = e.target.value;
                            setFilters({ ...filters, servicio: val, dependencia: 'Todas' });
                            fetchDependencies(val);
                        }}>
                        <option value="Todos">Todos</option>
                        {services.map(s => (
                            <option key={s.id} value={s.nombre}>{s.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ width: '180px' }}>
                    <label>Dependencia</label>
                    <select className="form-control" value={filters.dependencia || 'Todas'} onChange={e => setFilters({ ...filters, dependencia: e.target.value })}>
                        <option value="Todas">Todas</option>
                        {dependencies.map(d => (
                            <option key={d.id} value={d.nombre}>{d.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ width: '150px' }}>
                    <label>Programa</label>
                    <select className="form-control" value={filters.programa || 'Todos'} onChange={e => setFilters({ ...filters, programa: e.target.value })}>
                        <option value="Todos">Todos</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.nombre}>{p.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ width: '140px' }}>
                    <label>Estado Auditoría</label>
                    <select className="form-control" value={filters.status || 'all'} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                        <option value="all">Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="auditada_terreno">Auditada (Terreno)</option>
                        <option value="auditada_sistema">Auditada (Sistema)</option>
                        <option value="reabierto">Reabierto</option>
                        <option value="reapertura_pendiente">Reapertura Pendiente</option>
                    </select>
                </div>

                <div className="form-group" style={{ width: '160px' }}>
                    <label>Periodo</label>
                    <input
                        type="month"
                        className="form-control"
                        value={filters.period}
                        onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                    />
                </div>
                <div className="form-group" style={{ width: '140px' }}>
                    <label>Admin Contrato</label>
                    <select className="form-control" value={filters.admin_contrato || 'Todos'} onChange={e => setFilters({ ...filters, admin_contrato: e.target.value })}>
                        <option value="Todos">Todos</option>
                        {admins.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option> // ID or Name? Filter logic above uses ID maybe? logic above says 'Todos' or true. Updated to assume ID match if implemented later.
                        ))}
                    </select>
                </div>

                <button className="btn-primary" style={{ height: '38px', padding: '0 12px' }} title="Buscar">
                    <Search size={18} />
                </button>
                <button className="btn-secondary" style={{ height: '38px', padding: '0 12px', background: 'white', border: '1px solid #ccc' }}
                    onClick={() => {
                        setFilters({ search: '', period: '', status: 'all', servicio: 'Todos', dependencia: 'Todas', programa: 'Todos', auditoria: 'Todos', admin_contrato: 'Todos' });
                        fetchDependencies();
                    }}
                    title="Limpiar Filtros"
                >
                    <X size={18} color="#666" />
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Pending Registers Widget (Only for Contractor User) */}
            {user?.role === 'contratista_user' && myVinculacion && (
                <PendingRegistersWidget vinculacion={myVinculacion} existingRegistros={registros} />
            )}

            {/* Data Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>MES INFORMADO {sortConfig.key === 'periodo' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('eecc_nombre')} style={{ cursor: 'pointer' }}>CONTRATISTA {sortConfig.key === 'eecc_nombre' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th>RUT</th>
                            <th>PROGRAMA</th>
                            <th>SERVICIO</th>
                            <th>DEPENDENCIA</th>
                            <th style={{ textAlign: 'center' }}>DOTACIÓN<br />TOTAL</th>
                            <th style={{ textAlign: 'center' }}>PERSONAS<br />NUEVAS</th>
                            <th style={{ textAlign: 'center' }}>%<br />CONTRATISTA</th>
                            <th style={{ textAlign: 'center' }}>%<br />AUDITORÍA</th>
                            {/* <th style={{textAlign: 'center'}}>% PROMEDIO<br/>AÑO</th> */}
                            <th>FECHA ENVÍO</th>
                            <th>ADMIN<br />CONTRATO</th>
                            <th>AUDITORÍA</th>
                            <th style={{ textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRegistros.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="empty-row">No se encontraron registros coincidentes.</td>
                            </tr>
                        ) : (
                            sortedRegistros.map((registro, idx) => (
                                <tr key={registro.id}>
                                    <td style={{ fontWeight: 500, color: '#6b7280' }}>
                                        {idx + 1}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>
                                            {new Date(registro.periodo).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/^\w/, c => c.toUpperCase())}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>
                                            {registro.eecc_nombre || registro.usuario?.eecc_nombre || '-'}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
                                        {registro.usuario?.rut || '-'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {registro.programa?.nombre || 'Sin Programa'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {registro.vinculacionEntidad?.servicio?.nombre || 'N/A'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>{registro.dependencia || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {registro.dotacion_total || 0}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {registro.personas_nuevas || 0}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${getPorcentajeBadgeClass(registro.porcentaje_cumplimiento)}`}>
                                            {registro.porcentaje_cumplimiento}%
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {/* Mockup shows distinct style for Audit % */}
                                        <span className="badge badge--percent-audit">
                                            {registro.porcentaje_cumplimiento_auditor !== null ? `${registro.porcentaje_cumplimiento_auditor}%` : '-'}
                                        </span>
                                    </td>
                                    {/* <td style={{ textAlign: 'center' }}>
                                        <span className="badge badge--percent-avg">43.75%</span>
                                    </td> */}
                                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                        {new Date(registro.created_at).toLocaleDateString('es-CL')} <br />
                                        {new Date(registro.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ fontSize: '0.8rem' }}>
                                        {registro.vinculacionEntidad?.administraciones?.map(a => a.administradorContrato?.name).filter(Boolean).join(', ') || '-'}
                                    </td>
                                    <td>
                                        <span className={registro.tipo_auditoria === 'terreno' ? 'badge--audit-terreno' : 'badge--audit-sistema'}>
                                            {registro.tipo_auditoria === 'terreno' ? <Building size={12} /> : <Monitor size={12} />}
                                            {registro.tipo_auditoria === 'terreno' ? 'Terreno' : 'Sistema'}
                                        </span>
                                        {registro.estado_auditoria === 'reapertura_pendiente' && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                background: '#fef3c7', color: '#92400e', fontSize: '0.7rem',
                                                padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                                                marginTop: '4px'
                                            }}>
                                                ⏳ Reapertura Pend.
                                            </span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <div className="flex flex-col gap-1 items-end">
                                            {/* Action: Audit/Edit */}
                                            {(registro.estado_auditoria === 'pendiente' || registro.estado_auditoria === 'reabierto') ? (
                                                <Link to={`/registros/${registro.id}`} className="btn-icon" title="Editar Registro">
                                                    <Edit2 size={16} />
                                                </Link>
                                            ) : (
                                                <Link to={`/registros/${registro.id}`} className="btn-icon" title="Ver Detalle">
                                                    <Eye size={16} />
                                                </Link>
                                            )}

                                            {/* Action: Audit (US-003) */}
                                            {canWrite('Auditoria') && (
                                                <Link to={`/registros/${registro.id}/auditar`} className="btn-icon" title="Auditar Registro" style={{ color: '#d97706' }}>
                                                    <ClipboardCheck size={16} />
                                                </Link>
                                            )}

                                            {/* Action: PDF */}
                                            {canExec('Registros_Exportar') && (
                                                <button onClick={() => generatePDF(registro)} className="btn-action btn-pdf" style={{ background: '#ef4444', color: 'white', border: 'none' }} title="Descargar PDF">
                                                    <FileText size={12} /> PDF
                                                </button>
                                            )}

                                            {/* Action: Traceability */}
                                            <button
                                                onClick={() => {
                                                    setSelectedRegistroId(registro.id);
                                                    setTracePanelOpen(true);
                                                }}
                                                className="btn-icon"
                                                title="Ver Trazabilidad"
                                                style={{ color: '#8b5cf6' }}
                                            >
                                                <List size={16} />
                                            </button>

                                            {/* Action: Solicitar Reapertura (Contractors) */}
                                            {isContractor && registro.cerrado === 1 && registro.estado_auditoria !== 'reapertura_pendiente' && (
                                                <button
                                                    onClick={() => openReaperturaModal(registro.id)}
                                                    className="btn-icon"
                                                    title="Solicitar Reapertura"
                                                    style={{ color: '#d97706' }}
                                                >
                                                    <Lock size={16} />
                                                </button>
                                            )}

                                            {/* Action: Reabrir Directo (Admin/ADC) */}
                                            {isAdminOrADC && registro.cerrado === 1 && (
                                                <button
                                                    onClick={() => handleReabrirDirecto(registro.id)}
                                                    className="btn-icon"
                                                    title="Reabrir Registro"
                                                    style={{ color: '#10b981' }}
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}

                                            {/* Action: Delete (Admin/Exec) */}
                                            {canExec('Registros') && (
                                                <button
                                                    onClick={() => handleDelete(registro.id)}
                                                    className="btn-icon"
                                                    title="Eliminar Registro"
                                                    style={{ color: '#ef4444' }}
                                                >
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

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { formatPeriodo } from '../utils/dateUtils';
import { 
    AlertTriangle, 
    CheckCircle2, 
    FileText, 
    Clock, 
    ArrowRight,
    Search,
    Calendar,
    Filter,
    Building2,
    Check,
    X,
    User,
    ClipboardIcon,
    ArrowUpRight,
    AlertCircle,
    PlusCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import './Dashboard.css';

const MESES = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
];

export default function Pendientes() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Año y Periodo en curso preseleccionados
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

    const [selectedYear, setSelectedYear] = useState(() => {
        const urlP = searchParams.get('periodo');
        if (urlP && urlP !== 'todos' && urlP.length >= 4) return urlP.substring(0, 4);
        return searchParams.get('year') || currentYear;
    });

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const urlP = searchParams.get('periodo');
        if (urlP && urlP !== 'todos' && urlP.length >= 7) return urlP.substring(5, 7);
        return searchParams.get('month') || currentMonth;
    });

    const [kpis, setKpis] = useState(null);
    const [solicitudes, setSolicitudes] = useState([]);
    const [porAuditar, setPorAuditar] = useState([]);
    const [porRevisar, setPorRevisar] = useState([]);
    const [potentialAdmins, setPotentialAdmins] = useState([]);
    const [selectedAdc, setSelectedAdc] = useState('todos');

    const isPeriodoFiltered = selectedYear !== 'todos' || selectedMonth !== 'todos';
    const isCurrentPeriodSelected = selectedYear === currentYear && selectedMonth === currentMonth;

    const selectedPeriodo = useMemo(() => {
        if (selectedYear === 'todos' && selectedMonth === 'todos') return 'todos';
        if (selectedYear !== 'todos' && selectedMonth !== 'todos') return `${selectedYear}-${selectedMonth}`;
        if (selectedYear !== 'todos') return selectedYear;
        return `-${selectedMonth}`;
    }, [selectedYear, selectedMonth]);

    const handleYearChange = (newYear) => {
        setSelectedYear(newYear);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (newYear === 'todos') {
                next.delete('year');
            } else {
                next.set('year', newYear);
            }
            if (newYear !== 'todos' && selectedMonth !== 'todos') {
                next.set('periodo', `${newYear}-${selectedMonth}`);
            } else {
                next.delete('periodo');
            }
            return next;
        });
    };

    const handleMonthChange = (newMonth) => {
        setSelectedMonth(newMonth);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (newMonth === 'todos') {
                next.delete('month');
            } else {
                next.set('month', newMonth);
            }
            if (selectedYear !== 'todos' && newMonth !== 'todos') {
                next.set('periodo', `${selectedYear}-${newMonth}`);
            } else {
                next.delete('periodo');
            }
            return next;
        });
    };

    const handleResetPeriodoActual = () => {
        setSelectedYear(currentYear);
        setSelectedMonth(currentMonth);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('periodo', `${currentYear}-${currentMonth}`);
            next.delete('year');
            next.delete('month');
            return next;
        });
    };

    const handleVerTodosPeriodos = () => {
        setSelectedYear('todos');
        setSelectedMonth('todos');
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('periodo');
            next.delete('year');
            next.delete('month');
            return next;
        });
    };
    const [filterEstadoCreacion, setFilterEstadoCreacion] = useState('todos');
    const [filterEstadoAuditoria, setFilterEstadoAuditoria] = useState('todos');
    const [filterEstadoRevision, setFilterEstadoRevision] = useState('todos');
    const [filterEstadoSolicitud, setFilterEstadoSolicitud] = useState('todos');

    const fetchAdmins = async () => {
        try {
            const response = await api.get('/resources/adc').catch(() => ({ data: { data: [] } }));
            setPotentialAdmins(response.data.data || []);
        } catch (err) {
            console.error('Error fetching admins', err);
        }
    };
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vinculaciones, setVinculaciones] = useState([]);
    const [allRegistros, setAllRegistros] = useState([]);
    const [pendientesCreacion, setPendientesCreacion] = useState([]);

    const formatPeriodoStr = (periodoStr) => {
        if (!periodoStr || periodoStr === 'todos') return 'Todos';
        const str = String(periodoStr);
        if (/^\d{4}-\d{2}$/.test(str)) {
            const parts = str.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const d = new Date(year, month, 1);
            const formatted = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        if (/^\d{4}$/.test(str)) {
            return `Año ${str}`;
        }
        if (/^-\d{2}$/.test(str)) {
            const monthVal = str.replace('-', '');
            const mesObj = MESES.find(m => m.value === monthVal);
            return mesObj ? mesObj.label : `Mes ${monthVal}`;
        }
        return str;
    };

    const displayPeriodoLabel = useMemo(() => {
        if (selectedYear === 'todos' && selectedMonth === 'todos') {
            return 'Todos los Periodos';
        }
        if (selectedYear !== 'todos' && selectedMonth !== 'todos') {
            const mesObj = MESES.find(m => m.value === selectedMonth);
            return `${mesObj?.label || selectedMonth} ${selectedYear}`;
        }
        if (selectedYear !== 'todos') {
            return `Año ${selectedYear}`;
        }
        const mesObj = MESES.find(m => m.value === selectedMonth);
        return `Mes ${mesObj?.label || selectedMonth}`;
    }, [selectedYear, selectedMonth]);

    const matchesPeriodo = (p) => {
        if (!p) return false;
        const str = String(p);
        if (selectedYear !== 'todos' && selectedMonth !== 'todos') {
            return str.startsWith(`${selectedYear}-${selectedMonth}`);
        }
        if (selectedYear !== 'todos') {
            return str.startsWith(selectedYear);
        }
        if (selectedMonth !== 'todos') {
            return str.length >= 7 && str.substring(5, 7) === selectedMonth;
        }
        return true;
    };
    
    // Modal state for Reopening Requests
    const [actionModal, setActionModal] = useState({ show: false, solicitud: null, type: '' });
    const [responseText, setResponseText] = useState('');
    const [fechaLimite, setFechaLimite] = useState('');

    const calculatePendingPeriods = (vincs, allRegs) => {
        const pending = [];
        const now = new Date();
        // Tope explícito: último instante del mes en curso para garantizar su inclusión
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        vincs.forEach(v => {
            if (!v.fecha_inicio_contrato) return;
            // REGLA GLOBAL MANDATORIA: Solo considerar vinculaciones en servicios con programa asignado
            if (!v.servicio || !v.servicio.programa_id || String(v.servicio.programa_id) === 'null' || String(v.servicio.programa_id) === '0') return;
            
            let current = new Date(v.fecha_inicio_contrato);
            // Reset to first day of month
            current = new Date(current.getFullYear(), current.getMonth(), 1);
            
            while (current <= endOfCurrentMonth) {
                const year = current.getFullYear();
                const month = String(current.getMonth() + 1).padStart(2, '0');
                const periodStr = `${year}-${month}`;
                const isCurrentMonth = year === now.getFullYear() && current.getMonth() === now.getMonth();
                
                // Match by period AND correct FK field (contratista_asignacion_id refers to Vinculacion)
                const existingRecord = allRegs.find(r => 
                    r.periodo && 
                    r.periodo.startsWith(periodStr) && 
                    (r.contratista_asignacion_id === v.id || r.vinculacion_id === v.id)
                );
                
                if (!existingRecord) {
                    // State 1: Missing
                    pending.push({
                        periodo: periodStr,
                        date: new Date(current),
                        vinculacion: v,
                        action: 'create',
                        isCurrentMonth
                    });
                } else if (existingRecord.cerrado === 0 || existingRecord.cerrado === false) {
                    // State 2: Draft (Created but not submitted)
                    pending.push({
                        periodo: periodStr,
                        date: new Date(current),
                        vinculacion: v,
                        action: 'complete',
                        recordId: existingRecord.id,
                        isCurrentMonth
                    });
                }
                // State 3: Closed (cerrado: 1) -> Do not include in this widget
                
                current.setMonth(current.getMonth() + 1);
            }
        });
        
        // Ordenamiento universal: Empresa -> Contrato -> Fecha
        pending.sort((a, b) => {
            const empA = (a.vinculacion?.contratista?.nombre || a.vinculacion?.eecc_nombre || '').toLowerCase();
            const empB = (b.vinculacion?.contratista?.nombre || b.vinculacion?.eecc_nombre || '').toLowerCase();
            if (empA !== empB) return empA.localeCompare(empB);

            const ctrA = (a.vinculacion?.numero_contrato || '').toLowerCase();
            const ctrB = (b.vinculacion?.numero_contrato || '').toLowerCase();
            if (ctrA !== ctrB) return ctrA.localeCompare(ctrB);

            return a.date - b.date;
        });

        setPendientesCreacion(pending);
    };

    const availablePeriods = useMemo(() => {
        const periodSet = new Set();

        pendientesCreacion.forEach(item => {
            if (item.periodo) {
                const p = String(item.periodo).substring(0, 7);
                if (/^\d{4}-\d{2}$/.test(p)) periodSet.add(p);
            }
        });

        porAuditar.forEach(reg => {
            if (reg.periodo) {
                const p = String(reg.periodo).substring(0, 7);
                if (/^\d{4}-\d{2}$/.test(p)) periodSet.add(p);
            }
        });

        porRevisar.forEach(reg => {
            if (reg.periodo) {
                const p = String(reg.periodo).substring(0, 7);
                if (/^\d{4}-\d{2}$/.test(p)) periodSet.add(p);
            }
        });

        solicitudes.forEach(sol => {
            const raw = sol.periodo || sol.registro?.periodo;
            if (raw) {
                const p = String(raw).substring(0, 7);
                if (/^\d{4}-\d{2}$/.test(p)) periodSet.add(p);
            }
        });

        allRegistros.forEach(reg => {
            if (reg.periodo) {
                const p = String(reg.periodo).substring(0, 7);
                if (/^\d{4}-\d{2}$/.test(p)) periodSet.add(p);
            }
        });

        const urlP = searchParams.get('periodo');
        if (urlP && /^\d{4}-\d{2}$/.test(urlP)) {
            periodSet.add(urlP);
        }

        const now = new Date();
        for (let i = 0; i <= 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            periodSet.add(p);
        }

        return Array.from(periodSet).sort((a, b) => b.localeCompare(a));
    }, [pendientesCreacion, porAuditar, porRevisar, solicitudes, allRegistros, searchParams]);

    const availableYears = useMemo(() => {
        const yearsSet = new Set();
        const currentYearNum = new Date().getFullYear();

        yearsSet.add(String(currentYearNum));
        yearsSet.add(String(currentYearNum - 1));
        yearsSet.add(String(currentYearNum + 1));

        availablePeriods.forEach(p => {
            if (typeof p === 'string' && p.length >= 4) {
                const y = p.substring(0, 4);
                if (/^\d{4}$/.test(y)) yearsSet.add(y);
            }
        });

        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [availablePeriods]);

    const filteredPendientesCreacion = useMemo(() => {
        let list = pendientesCreacion;
        if (isPeriodoFiltered) {
            list = list.filter(item => matchesPeriodo(item.periodo));
        }
        if (filterEstadoCreacion === 'todos') return list;
        return list.filter(item => item.action === filterEstadoCreacion);
    }, [pendientesCreacion, filterEstadoCreacion, isPeriodoFiltered, selectedYear, selectedMonth]);

    const filteredPorAuditar = useMemo(() => {
        let list = porAuditar;
        if (isPeriodoFiltered) {
            list = list.filter(reg => matchesPeriodo(reg.periodo));
        }
        if (filterEstadoAuditoria === 'todos') return list;
        return list.filter(reg => {
            if (filterEstadoAuditoria === 'auditable') {
                return ['auditable', 'pendiente'].includes(reg.estado_auditoria);
            }
            return reg.estado_auditoria === filterEstadoAuditoria;
        });
    }, [porAuditar, filterEstadoAuditoria, isPeriodoFiltered, selectedYear, selectedMonth]);

    const filteredPorRevisar = useMemo(() => {
        let list = porRevisar;
        if (isPeriodoFiltered) {
            list = list.filter(reg => matchesPeriodo(reg.periodo));
        }
        if (filterEstadoRevision === 'todos') return list;
        return list.filter(reg => reg.estado_auditoria === filterEstadoRevision);
    }, [porRevisar, filterEstadoRevision, isPeriodoFiltered, selectedYear, selectedMonth]);

    const filteredSolicitudes = useMemo(() => {
        let list = solicitudes;
        if (isPeriodoFiltered) {
            list = list.filter(sol => matchesPeriodo(sol.periodo || sol.registro?.periodo));
        }
        if (filterEstadoSolicitud === 'todos') return list;
        return list.filter(sol => sol.estado === filterEstadoSolicitud);
    }, [solicitudes, filterEstadoSolicitud, isPeriodoFiltered, selectedYear, selectedMonth]);

    const kpiSolicitudesCount = useMemo(() => {
        let list = solicitudes;
        if (isPeriodoFiltered) {
            list = list.filter(s => matchesPeriodo(s.periodo || s.registro?.periodo));
        }
        return list.filter(s => s.estado === 'pendiente').length;
    }, [solicitudes, isPeriodoFiltered, selectedYear, selectedMonth]);

    const kpiCreacionCount = useMemo(() => {
        if (!isPeriodoFiltered) return pendientesCreacion.length;
        return pendientesCreacion.filter(item => matchesPeriodo(item.periodo)).length;
    }, [pendientesCreacion, isPeriodoFiltered, selectedYear, selectedMonth]);

    const kpiAuditarCount = useMemo(() => {
        if (!isPeriodoFiltered) return porAuditar.length;
        return porAuditar.filter(reg => matchesPeriodo(reg.periodo)).length;
    }, [porAuditar, isPeriodoFiltered, selectedYear, selectedMonth]);

    const kpiRevisarCount = useMemo(() => {
        if (!isPeriodoFiltered) return porRevisar.length;
        return porRevisar.filter(reg => matchesPeriodo(reg.periodo)).length;
    }, [porRevisar, isPeriodoFiltered, selectedYear, selectedMonth]);

    useEffect(() => {
        fetchAllData();
        if (user?.role === 'admin' && potentialAdmins.length === 0) {
            fetchAdmins();
        }
    }, [user, selectedAdc]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const auditParams = isAdminOrADC 
                ? 'pendiente,auditando' 
                : 'abierto,reabierto';
            const reviewParams = isAdminOrADC 
                ? 'subsanado,en_revision' 
                : 'pendiente_subsanacion';

            const params = new URLSearchParams();
            if (selectedAdc !== 'todos') {
                params.append('adc_id', selectedAdc);
            }
            const queryStr = params.toString() ? `&${params.toString()}` : '';
            const queryStrFirst = params.toString() ? `?${params.toString()}` : '';

            const safeGet = (url, fallback = []) => api.get(url).catch(err => {
                console.error(`Error loading ${url}`, err);
                return { data: { data: fallback } };
            });

            const vincParams = new URLSearchParams();
            if (selectedAdc !== 'todos') {
                vincParams.append('adc_id', selectedAdc);
            }
            if (user?.role === 'contratista_user') {
                if (user.contratista_id) vincParams.append('contratista_id', user.contratista_id);
                if (user.tipo_contratista_id) vincParams.append('servicio_id', user.tipo_contratista_id);
                if (user.dependencia_id) vincParams.append('dependencia_id', user.dependencia_id);
            }

            const promises = [
                safeGet(`/dashboard/kpis${queryStrFirst}`, {}),
                safeGet(`/reaperturas${queryStrFirst}`, []),
                safeGet(`/registros?estado_auditoria=${auditParams}${queryStr}`, []),
                safeGet(`/registros?estado_auditoria=${reviewParams}${queryStr}`, []),
                safeGet(`/vinculaciones?${vincParams.toString()}`, []),
                safeGet(`/registros${queryStrFirst}`, [])
            ];

            const results = await Promise.all(promises);
            
            const [kpiRes, solRes, auditRes, reviewRes, vincRes, allRegsRes] = results;

            setKpis(kpiRes.data.data);
            setSolicitudes(solRes.data.data || []);
            setPorAuditar(auditRes.data.data || []);
            setPorRevisar(reviewRes.data.data || []);

            const vincs = vincRes.data.data || [];
            const allRegs = allRegsRes.data.data || [];
            setVinculaciones(vincs);
            setAllRegistros(allRegs);
            calculatePendingPeriods(vincs, allRegs);

            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Error al cargar datos pendientes');
            setLoading(false);
        }
    };

    const handleProcessSolicitud = async () => {
        if (actionModal.type === 'rechazar' && !responseText) {
            toast.error('Debe proporcionar el motivo del rechazo');
            return;
        }

        try {
            const endpoint = `/reaperturas/${actionModal.solicitud.id}/${actionModal.type}`;
            await api.put(endpoint, {
                respuesta: responseText,
                fecha_limite: fechaLimite
            });
            
            toast.success(`Solicitud ${actionModal.type === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`);
            setActionModal({ show: false, solicitud: null, type: '' });
            setResponseText('');
            setFechaLimite('');
            fetchAllData();
        } catch (err) {
            toast.error('Error al procesar la solicitud');
        }
    };

    const isAdminOrADC = user?.role === 'admin' || user?.role === 'administrador_contrato';

    if (loading) return (
        <div className="dashboard-page">
            <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '1rem' }} />
            <div className="kpi-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />)}
            </div>
        </div>
    );

    return (
        <div className="dashboard-page">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ backgroundColor: '#6366f1', padding: '12px', borderRadius: '12px', color: 'white' }}>
                        <ClipboardIcon size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0 }}>Pendientes de Acción</h1>
                        <span className="subtitle" style={{ color: '#6b7280', fontSize: '0.95rem' }}>Gestión de solicitudes y validación de registros</span>
                    </div>
                </div>
            </header>

            {/* General Filters Toolbar */}
            <div style={{ 
                background: '#ffffff', 
                padding: '0.875rem 1.25rem', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                marginBottom: '1.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex', 
                flexWrap: 'wrap',
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.25rem' }}>
                    
                    {/* Filtro General por Periodo: Año y Nombre de Mes seleccionables */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            color: isPeriodoFiltered ? '#4f46e5' : '#64748b'
                        }}>
                            <Calendar size={18} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                                Periodo:
                            </span>
                        </div>

                        {/* Selector de Año */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                id="filter-year-select"
                                value={selectedYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: selectedYear !== 'todos' ? '#1e293b' : '#64748b',
                                    border: `1px solid ${selectedYear !== 'todos' ? '#6366f1' : '#cbd5e1'}`,
                                    borderRadius: '8px',
                                    backgroundColor: selectedYear !== 'todos' ? '#f5f7ff' : '#ffffff',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                            >
                                <option value="todos">Todos los Años</option>
                                {availableYears.map(y => (
                                    <option key={y} value={y}>
                                        {y} {y === currentYear ? '(Año en curso)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de Mes con Nombre de Mes en español */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                id="filter-month-select"
                                value={selectedMonth}
                                onChange={(e) => handleMonthChange(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: selectedMonth !== 'todos' ? '#1e293b' : '#64748b',
                                    border: `1px solid ${selectedMonth !== 'todos' ? '#6366f1' : '#cbd5e1'}`,
                                    borderRadius: '8px',
                                    backgroundColor: selectedMonth !== 'todos' ? '#f5f7ff' : '#ffffff',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    minWidth: '150px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                            >
                                <option value="todos">Todos los Meses</option>
                                {MESES.map(m => {
                                    const isCurrent = m.value === currentMonth && selectedYear === currentYear;
                                    return (
                                        <option key={m.value} value={m.value}>
                                            {m.label} {isCurrent ? '(Mes en curso)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Botón Volver a Periodo en Curso si se cambió */}
                        {!isCurrentPeriodSelected && (
                            <button
                                type="button"
                                onClick={handleResetPeriodoActual}
                                style={{
                                    padding: '5px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: '#4f46e5',
                                    backgroundColor: '#eef2ff',
                                    border: '1px solid #c7d2fe',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="Volver al periodo en curso"
                            >
                                Periodo en curso
                            </button>
                        )}

                        {/* Botón Ver Todos si hay filtro activo */}
                        {isPeriodoFiltered && (
                            <button
                                type="button"
                                onClick={handleVerTodosPeriodos}
                                style={{
                                    padding: '5px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="Ver todos los periodos históricos"
                            >
                                Ver Todos
                            </button>
                        )}
                    </div>

                    {/* Filtro por Administrador de Contrato (ADC) */}
                    {user?.role === 'admin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                <Filter size={16} />
                                <label htmlFor="filter-adc-select" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                    Filtrar por ADC:
                                </label>
                            </div>
                            <select
                                id="filter-adc-select"
                                value={selectedAdc}
                                onChange={(e) => setSelectedAdc(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1e293b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    minWidth: '220px',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                            >
                                <option value="todos">Todos los Administradores</option>
                                {potentialAdmins.map(admin => (
                                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Status Indicator / Active Filter Info */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: isCurrentPeriodSelected ? '#ecfdf5' : isPeriodoFiltered ? '#e0e7ff' : '#f1f5f9',
                    color: isCurrentPeriodSelected ? '#047857' : isPeriodoFiltered ? '#3730a3' : '#475569',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: `1px solid ${isCurrentPeriodSelected ? '#a7f3d0' : isPeriodoFiltered ? '#c7d2fe' : '#e2e8f0'}`
                }}>
                    <span>Periodo: {displayPeriodoLabel} {isCurrentPeriodSelected ? '• EN CURSO' : ''}</span>
                </div>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

            {/* KPIs Summary */}
            <div className="kpi-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                        <Clock size={20} color="#f59e0b" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">SOLICITUDES REAPERTURA</span>
                        <span className="kpi-card-value" style={{ color: '#f59e0b' }}>{kpiSolicitudesCount}</span>
                        <span className="kpi-card-subtitle">{selectedPeriodo !== 'todos' ? `Periodo ${formatPeriodoStr(selectedPeriodo)}` : 'Pendientes de aprobación'}</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #f97316' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#fff7ed' }}>
                        <AlertCircle size={20} color="#f97316" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">PENDIENTES DE CREACIÓN</span>
                        <span className="kpi-card-value" style={{ color: '#f97316' }}>{kpiCreacionCount}</span>
                        <span className="kpi-card-subtitle">{selectedPeriodo !== 'todos' ? `Periodo ${formatPeriodoStr(selectedPeriodo)}` : 'Carpetas por iniciar o completar'}</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#eff6ff' }}>
                        <FileText size={20} color="#3b82f6" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">POR AUDITAR</span>
                        <span className="kpi-card-value" style={{ color: '#3b82f6' }}>{kpiAuditarCount}</span>
                        <span className="kpi-card-subtitle">{selectedPeriodo !== 'todos' ? `Periodo ${formatPeriodoStr(selectedPeriodo)}` : 'Nuevas carpetas entregadas'}</span>
                    </div>
                </div>

                <div className="kpi-card-polished" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className="kpi-card-icon-wrapper" style={{ backgroundColor: '#f5f3ff' }}>
                        <CheckCircle2 size={20} color="#8b5cf6" />
                    </div>
                    <div className="kpi-card-content">
                        <span className="kpi-card-title">REVISIÓN SUBSANACIÓN</span>
                        <span className="kpi-card-value" style={{ color: '#8b5cf6' }}>{kpiRevisarCount}</span>
                        <span className="kpi-card-subtitle">{selectedPeriodo !== 'todos' ? `Periodo ${formatPeriodoStr(selectedPeriodo)}` : 'Correcciones listas para validar'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
                
                {/* 1. Solicitudes de Reapertura - Solo Admin/ADC */}
                {isAdminOrADC && (
                    <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#fffbeb', padding: '8px', borderRadius: '8px' }}>
                                <Clock size={20} color="#f59e0b" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Solicitudes de Reapertura</h3>
                            <span style={{ backgroundColor: '#f59e0b', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{filteredSolicitudes.length}</span>
                        </div>

                        {filteredSolicitudes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                {solicitudes.length === 0 ? 'No hay solicitudes de reapertura.' : (selectedPeriodo !== 'todos' ? `No hay solicitudes de reapertura para el periodo ${formatPeriodoStr(selectedPeriodo)}.` : 'No hay solicitudes coincidentes con los filtros seleccionados.')}
                            </div>
                        ) : (
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>EECC / CONTRATISTA</th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>Nº CONTRATO / SERVICIO / DEPENDENCIA</th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO / PROGRAMA</th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>MOTIVO</th>
                                            <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <span>ESTADO</span>
                                                    <select
                                                        value={filterEstadoSolicitud}
                                                        onChange={e => setFilterEstadoSolicitud(e.target.value)}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '3px 6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: '#ffffff',
                                                            color: '#1f2937',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                        }}
                                                    >
                                                        <option value="todos">Todos</option>
                                                        <option value="pendiente">Pendiente</option>
                                                        <option value="aprobada">Aprobada</option>
                                                        <option value="rechazada">Rechazada</option>
                                                    </select>
                                                </div>
                                            </th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSolicitudes.map(sol => {
                                            const reg = sol.registro || allRegistros.find(r => r.id === sol.registro_id);
                                            const vinc = reg?.vinculacionEntidad || reg?.asignacion || vinculaciones.find(v => v.id === reg?.contratista_asignacion_id);
                                            const numContrato = vinc?.numero_contrato || reg?.numero_contrato;
                                            const servicioNombre = vinc?.servicio?.nombre || reg?.vinculacionEntidad?.servicio?.nombre;
                                            const dependenciaNombre = vinc?.dependencia?.nombre || reg?.dependencia || reg?.vinculacionEntidad?.dependencia?.nombre;
                                            const periodoVal = reg?.periodo || sol.periodo;
                                            const programaNombre = reg?.programa?.nombre;

                                            return (
                                                <tr key={sol.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                                    <td style={{ padding: '1rem 0.75rem' }}>
                                                        <div style={{ fontWeight: 600, color: '#111827' }}>{reg?.eecc_nombre || vinc?.contratista?.nombre || '-'}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID Registro: #{sol.registro_id}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem' }}>
                                                        <div style={{ color: '#374151', fontWeight: 600 }}>
                                                            {numContrato ? (String(numContrato).toLowerCase().startsWith('contrato') ? numContrato : `Contrato N° ${numContrato}`) : (servicioNombre || 'Servicio')}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                            {servicioNombre || 'N/A'} • {dependenciaNombre || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem' }}>
                                                        <div style={{ color: '#374151', fontWeight: 600 }}>{formatPeriodo(periodoVal)}</div>
                                                        {programaNombre && (
                                                            <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>{programaNombre}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem', maxWidth: '300px' }}>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.4 }}>{sol.motivo}</p>
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                            backgroundColor: sol.estado === 'pendiente' ? '#fef9c3' : (sol.estado === 'aprobada' ? '#dcfce7' : '#fee2e2'),
                                                            color: sol.estado === 'pendiente' ? '#854d0e' : (sol.estado === 'aprobada' ? '#166534' : '#991b1b'),
                                                            border: `1px solid ${sol.estado === 'pendiente' ? '#fde047' : (sol.estado === 'aprobada' ? '#bbf7d0' : '#fecaca')}`
                                                        }}>
                                                            {sol.estado === 'pendiente' ? 'Pendiente' : (sol.estado === 'aprobada' ? 'Aprobada' : 'Rechazada')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                        {sol.estado === 'pendiente' ? (
                                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                <button 
                                                                    onClick={() => setActionModal({ show: true, solicitud: sol, type: 'aprobar' })}
                                                                    className="btn-success" 
                                                                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                                                >
                                                                    <Check size={16} /> Aprobar
                                                                </button>
                                                                <button 
                                                                    onClick={() => setActionModal({ show: true, solicitud: sol, type: 'rechazar' })}
                                                                    className="btn-danger" 
                                                                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                                                >
                                                                    <X size={16} /> Rechazar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                                {sol.estado === 'aprobada' ? 'Procesada' : 'Finalizada'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {/* 2. Registros Pendientes de Creación - Visible para Todos los Roles segun Scope */}
                {pendientesCreacion.length > 0 && (
                    <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                            <div style={{ backgroundColor: '#fff7ed', padding: '8px', borderRadius: '8px' }}>
                                <AlertCircle size={20} color="#f97316" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Registros Pendientes de Creación</h3>
                            <span style={{ backgroundColor: '#f97316', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{filteredPendientesCreacion.length}</span>
                        </div>

                        {filteredPendientesCreacion.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                {selectedPeriodo !== 'todos' ? `No hay registros pendientes de creación para el periodo ${formatPeriodoStr(selectedPeriodo)}.` : 'No hay registros coincidentes con el estado seleccionado.'}
                            </div>
                        ) : (
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>EMPRESA CONTRATISTA</th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>Nº CONTRATO / SERVICIO / DEPENDENCIA</th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO</th>
                                            <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <span>ESTADO</span>
                                                    <select
                                                        value={filterEstadoCreacion}
                                                        onChange={e => setFilterEstadoCreacion(e.target.value)}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '3px 6px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: '#ffffff',
                                                            color: '#1f2937',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                        }}
                                                    >
                                                        <option value="todos">Todos</option>
                                                        <option value="create">Por Crear</option>
                                                        <option value="complete">En Borrador</option>
                                                    </select>
                                                </div>
                                            </th>
                                            <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPendientesCreacion.map((item, idx) => (
                                            <tr key={`${item.periodo}-${idx}`} style={{ borderBottom: '1px solid #f9fafb', backgroundColor: item.isCurrentMonth ? '#f0fdfa' : 'transparent' }}>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ fontWeight: 700, color: '#111827' }}>
                                                        {item.vinculacion?.contratista?.nombre || item.vinculacion?.eecc_nombre || 'N/A'}
                                                    </div>
                                                    {item.vinculacion?.contratista?.rut && (
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>RUT: {item.vinculacion.contratista.rut}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ color: '#374151', fontWeight: 600 }}>
                                                        {item.vinculacion?.numero_contrato ? `Contrato N° ${item.vinculacion.numero_contrato}` : (item.vinculacion?.servicio?.nombre || 'Servicio')}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        {item.vinculacion?.servicio?.nombre} • {item.vinculacion?.dependencia?.nombre}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ 
                                                            fontWeight: 600, 
                                                            color: item.isCurrentMonth ? '#0d9488' : (item.action === 'create' ? '#f97316' : '#3b82f6'), 
                                                            textTransform: 'capitalize' 
                                                        }}>
                                                            {item.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                                                        </span>
                                                        {item.isCurrentMonth && (
                                                            <span style={{
                                                                backgroundColor: '#0d9488', color: 'white',
                                                                borderRadius: '10px', padding: '2px 8px',
                                                                fontSize: '0.65rem', fontWeight: 700,
                                                                letterSpacing: '0.5px', whiteSpace: 'nowrap'
                                                            }}>MES ACTUAL</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                    {item.action === 'complete' ? (
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                            backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe'
                                                        }}>
                                                            En Borrador
                                                        </span>
                                                    ) : (
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                            backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa'
                                                        }}>
                                                            Por Crear
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                    {item.action === 'complete' ? (
                                                        <button 
                                                            onClick={() => navigate(`/registros/${item.recordId}/edit`)}
                                                            style={{ 
                                                                backgroundColor: '#3b82f6', color: 'white', border: 'none', 
                                                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                            }}
                                                        >
                                                            <ArrowRight size={14} /> Completar Registro
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => navigate(`/registros/new?periodo=${item.periodo}&vinculacion_id=${item.vinculacion.id}`)}
                                                            style={{ 
                                                                backgroundColor: item.isCurrentMonth ? '#0d9488' : '#f97316', color: 'white', border: 'none', 
                                                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                            }}
                                                        >
                                                            <PlusCircle size={14} /> Crear Registro
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {/* 3. Registros Pendientes de Auditoría */}
                <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px' }}>
                            <FileText size={20} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Registros Pendientes de Auditoría</h3>
                        <span style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{filteredPorAuditar.length}</span>
                    </div>

                    {porAuditar.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>No hay registros por auditar.</div>
                    ) : filteredPorAuditar.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>{selectedPeriodo !== 'todos' ? `No hay registros por auditar para el periodo ${formatPeriodoStr(selectedPeriodo)}.` : 'No hay registros coincidentes con el estado seleccionado.'}</div>
                    ) : (
                        <div className="table-container" style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>EECC / NOMBRE</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>Nº CONTRATO / SERVICIO / DEPENDENCIA</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO / PROGRAMA</th>
                                        <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <span>ESTADO</span>
                                                <select
                                                    value={filterEstadoAuditoria}
                                                    onChange={e => setFilterEstadoAuditoria(e.target.value)}
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        padding: '3px 6px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: '#ffffff',
                                                        color: '#1f2937',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <option value="todos">Todos</option>
                                                    <option value="auditable">Auditable</option>
                                                    <option value="auditando">En Auditoría</option>
                                                    <option value="abierto">Abierto</option>
                                                    <option value="reabierto">Reabierto</option>
                                                </select>
                                            </div>
                                        </th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPorAuditar.map(reg => {
                                        const vinc = reg.vinculacionEntidad || reg.asignacion || reg.vinculacion;
                                        return (
                                            <tr key={reg.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>{reg.eecc_nombre}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: #{reg.id}</div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ color: '#374151', fontWeight: 600 }}>
                                                        {vinc?.numero_contrato ? `Contrato N° ${vinc.numero_contrato}` : (vinc?.servicio?.nombre || 'Servicio')}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        {vinc?.servicio?.nombre || 'N/A'} • {vinc?.dependencia?.nombre || reg.dependencia || 'N/A'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ color: '#374151' }}>{formatPeriodoStr(reg.periodo)}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>{reg.programa?.nombre}</div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                    <span style={{ 
                                                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                        backgroundColor: reg.estado_auditoria === 'auditando' ? '#eff6ff' : (reg.estado_auditoria === 'reabierto' ? '#fff7ed' : '#fef9c3'),
                                                        color: reg.estado_auditoria === 'auditando' ? '#1d4ed8' : (reg.estado_auditoria === 'reabierto' ? '#ea580c' : '#854d0e'),
                                                        border: `1px solid ${reg.estado_auditoria === 'auditando' ? '#bfdbfe' : (reg.estado_auditoria === 'reabierto' ? '#fed7aa' : '#fef08a')}`
                                                    }}>
                                                        {reg.estado_auditoria === 'auditando' ? 'En Auditoría' : (reg.estado_auditoria === 'reabierto' ? 'Reabierto' : (reg.estado_auditoria === 'abierto' ? 'Abierto' : 'Auditable'))}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                    {isAdminOrADC ? (
                                                        <button 
                                                            onClick={() => navigate(`/registros/${reg.id}/auditar`)}
                                                            style={{ 
                                                                backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', 
                                                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                            }}
                                                        >
                                                            Iniciar Auditoría <ArrowUpRight size={14} />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                const isEditable = ['abierto', 'reabierto'].includes(reg.estado_auditoria);
                                                                navigate(`/registros/${reg.id}`, { state: isEditable ? {} : { readonly: true } });
                                                            }}
                                                            style={{ 
                                                                backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', 
                                                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                            }}
                                                        >
                                                            {['abierto', 'reabierto'].includes(reg.estado_auditoria) ? <>Editar <ArrowRight size={14} /></> : <>Ver <ArrowRight size={14} /></>}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* 4. Revisión de Subsanación */}
                <section className="dashboard-section-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#f5f3ff', padding: '8px', borderRadius: '8px' }}>
                            <CheckCircle2 size={20} color="#8b5cf6" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>Pendientes de Revisión (Subsanados)</h3>
                        <span style={{ backgroundColor: '#8b5cf6', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{filteredPorRevisar.length}</span>
                    </div>

                    {porRevisar.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>No hay registros por revisar.</div>
                    ) : filteredPorRevisar.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontStyle: 'italic' }}>{selectedPeriodo !== 'todos' ? `No hay registros por revisar para el periodo ${formatPeriodoStr(selectedPeriodo)}.` : 'No hay registros coincidentes con el estado seleccionado.'}</div>
                    ) : (
                        <div className="table-container" style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>EECC / NOMBRE</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>Nº CONTRATO / SERVICIO / DEPENDENCIA</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700 }}>PERIODO / PROGRAMA</th>
                                        <th style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <span>ESTADO</span>
                                                <select
                                                    value={filterEstadoRevision}
                                                    onChange={e => setFilterEstadoRevision(e.target.value)}
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        padding: '3px 6px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: '#ffffff',
                                                        color: '#1f2937',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <option value="todos">Todos</option>
                                                    <option value="subsanado">Subsanado</option>
                                                    <option value="en_revision">En Revisión</option>
                                                    <option value="pendiente_subsanacion">Pendiente Subsanación</option>
                                                </select>
                                            </div>
                                        </th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>AVANCE</th>
                                        <th style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPorRevisar.map(reg => {
                                        const vinc = reg.vinculacionEntidad || reg.asignacion || reg.vinculacion;
                                        return (
                                            <tr key={reg.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>{reg.eecc_nombre}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: #{reg.id}</div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ color: '#374151', fontWeight: 600 }}>
                                                        {vinc?.numero_contrato ? `Contrato N° ${vinc.numero_contrato}` : (vinc?.servicio?.nombre || 'Servicio')}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        {vinc?.servicio?.nombre || 'N/A'} • {vinc?.dependencia?.nombre || reg.dependencia || 'N/A'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <div style={{ color: '#374151' }}>{formatPeriodoStr(reg.periodo)}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>{reg.programa?.nombre}</div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                    {(() => {
                                                        const st = reg.estado_auditoria;
                                                        if (st === 'en_revision') {
                                                            return (
                                                                <span style={{ 
                                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                    backgroundColor: '#eff6ff', color: '#0284c7', border: '1px solid #bae6fd'
                                                                }}>
                                                                    En Revisión
                                                                </span>
                                                            );
                                                        }
                                                        if (st === 'subsanado') {
                                                            return (
                                                                <span style={{ 
                                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                    backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe'
                                                                }}>
                                                                    Subsanado
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span style={{ 
                                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5'
                                                            }}>
                                                                Pendiente Subsanación
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{reg.porcentaje_cumplimiento}%</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>DECLARADO</div>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                                                    {isAdminOrADC ? (
                                                        <button 
                                                            onClick={() => navigate(`/registros/${reg.id}/auditar`)}
                                                            style={{ 
                                                                backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', 
                                                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                            }}
                                                        >
                                                            Revisar <CheckCircle2 size={14} />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                const isEditable = reg.estado_auditoria === 'pendiente_subsanacion';
                                                                navigate(`/registros/${reg.id}`, { state: isEditable ? {} : { readonly: true } });
                                                            }}
                                                            style={{ 
                                                                backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', 
                                                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600
                                                            }}
                                                        >
                                                            {reg.estado_auditoria === 'pendiente_subsanacion' ? <>Editar <ArrowRight size={14} /></> : <>Ver <ArrowRight size={14} /></>}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Modal for Reapertura Processing */}
            {actionModal.show && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
                }}>
                    <div style={{ 
                        backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', 
                        width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                    }}>
                        <h2 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: actionModal.type === 'aprobar' ? '#10b981' : '#ef4444' }}>
                            {actionModal.type === 'aprobar' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                            {actionModal.type === 'aprobar' ? 'Aprobar Reapertura' : 'Rechazar Reapertura'}
                        </h2>
                        
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Estás por {actionModal.type} la solicitud para el registro de <strong>{actionModal.solicitud?.registro?.eecc_nombre}</strong> ({formatPeriodo(actionModal.solicitud?.registro?.periodo, { monthFormat: 'short' })}).
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                {actionModal.type === 'aprobar' ? 'Respuesta / Instrucciones' : 'Motivo del Rechazo *'}
                            </label>
                            <textarea 
                                className="form-control"
                                rows={4}
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder={actionModal.type === 'aprobar' ? "Ej: Aprobado para corrección de dotación." : "Ej: El motivo no justifica la reapertura del periodo cerrado."}
                                style={{ borderRadius: '8px', padding: '0.75rem' }}
                            />
                        </div>

                        {actionModal.type === 'aprobar' && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                    Fecha Límite para Subsanación (Opcional)
                                </label>
                                <input 
                                    type="date"
                                    className="form-control"
                                    value={fechaLimite}
                                    onChange={(e) => setFechaLimite(e.target.value)}
                                    style={{ borderRadius: '8px' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setActionModal({ show: false, solicitud: null, type: '' })}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleProcessSolicitud}
                                style={{ 
                                    padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', 
                                    background: actionModal.type === 'aprobar' ? '#10b981' : '#ef4444', 
                                    color: 'white', cursor: 'pointer', fontWeight: 600 
                                }}
                            >
                                Confirmar {actionModal.type}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

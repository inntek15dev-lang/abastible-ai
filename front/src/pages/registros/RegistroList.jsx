// IEEE Trace: REQ-002 | US-002, US-050 | pages/registros/RegistroList.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Eye, Edit, Edit2, RefreshCw, Trash2, FileText, Search, Filter, Calendar, Building, List, ClipboardCheck, Monitor, X, Lock, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast'; // Import toast
import TraceabilityPanel from '../../components/TraceabilityPanel';
import SolicitudReaperturaModal from '../../components/forms/SolicitudReaperturaModal';
import PendingRegistersWidget from '../../components/widgets/PendingRegistersWidget';
import CompromisosModal from '../../components/modals/CompromisosModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';


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
    const [showCompromisos, setShowCompromisos] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        action: null,
        title: '',
        message: ''
    });

    // Resource States
    const [dependencies, setDependencies] = useState([]);
    const [services, setServices] = useState([]); // Tipos de Contratista
    const [programs, setPrograms] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [gerencias, setGerencias] = useState([]);
    const [subgerenciasRaw, setSubgerenciasRaw] = useState([]);

    // Advanced Filters State (US-050)
    const [filters, setFilters] = useState({
        search: '',
        period: '',
        status: 'all',
        servicio: 'Todos',
        dependencia: 'Todas',
        programa: 'Todos',
        admin_contrato: 'Todos',
        gerencia: 'Todas',
        subgerencia: 'Todas'
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
            const [servRes, progRes, userRes, gerRes, subgRes] = await Promise.all([
                api.get('/resources/tipos-contratista'),
                api.get('/programas'),
                api.get('/usuarios?role=administrador_contrato'),
                api.get('/resources/gerencias'),
                api.get('/resources/subgerencias')
            ]);
            setServices(servRes.data.data);
            setPrograms(progRes.data.data);
            setAdmins(userRes.data.data);
            setGerencias(gerRes.data.data);
            setSubgerenciasRaw(subgRes.data.data);

            // Initial load of all dependencies
            await fetchDependencies();
        } catch (err) {
            console.error("Error fetching filter resources", err);
        }
    };

    const fetchRegistros = async (currentFilters = filters) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (currentFilters.gerencia && currentFilters.gerencia !== 'Todas') params.append('gerencia_id', currentFilters.gerencia);
            if (currentFilters.subgerencia && currentFilters.subgerencia !== 'Todas') params.append('subgerencia_id', currentFilters.subgerencia);
            
            const response = await api.get(`/registros?${params.toString()}`);
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

    // Calculate Yearly Averages
    const yearlyAverages = useMemo(() => {
        const stats = {};
        registros.forEach(reg => {
            if (!reg.periodo) return;
            const year = reg.periodo.substring(0, 4);
            // key: contractorId (or EECC name if ID missing) + vinculacionId (or Service+Dep) + Year
            // Using vinculacion_id is best if reliable. If not, fallback to Name+Service
            const vincKey = reg.vinculacion_id || `${reg.eecc_nombre}-${reg.vinculacionEntidad?.servicio_id}-${reg.dependencia}`;
            const key = `${vincKey}-${year}`;

            if (!stats[key]) stats[key] = { sum: 0, count: 0 };

            // Logic: Use Contractor Score
            const score = parseFloat(reg.porcentaje_cumplimiento || 0);
            stats[key].sum += score;
            stats[key].count += 1;
        });

        const averages = {};
        Object.keys(stats).forEach(k => {
            averages[k] = (stats[k].sum / stats[k].count).toFixed(2);
        });
        return averages;
    }, [registros]);

    const filteredSubgerencias = useMemo(() => {
        if (!filters.gerencia || filters.gerencia === 'Todas') return subgerenciasRaw;
        return subgerenciasRaw.filter(s => String(s.gerencia_id) === String(filters.gerencia));
    }, [filters.gerencia, subgerenciasRaw]);

    // Trigger fetch on hierarchy change
    useEffect(() => {
        fetchRegistros();
    }, [filters.gerencia, filters.subgerencia]);

    const getAnnualAverage = (reg) => {
        if (!reg.periodo) return 0;
        const year = reg.periodo.substring(0, 4);
        const vincKey = reg.vinculacion_id || `${reg.eecc_nombre}-${reg.vinculacionEntidad?.servicio_id}-${reg.dependencia}`;
        const key = `${vincKey}-${year}`;
        return yearlyAverages[key] || 0;
    };

    // --- Computed Filtered Data ---
    const filteredRegistros = useMemo(() => {
        return registros.filter(reg => {
            // Text Search
            const searchText = filters.search.toLowerCase();
            const contractorName = (reg.eecc_nombre || reg.usuario?.eecc_nombre || '').toLowerCase();
            const contractorRut = (reg.usuario?.rut || '').toLowerCase();
            const matchesSearch = !searchText || contractorName.includes(searchText) || contractorRut.includes(searchText);

            // Dynamic Filters
            const regService = reg.asignacion?.servicio?.nombre || (reg.vinculacionEntidad?.servicio?.nombre) || 'GRANEL';
            const matchesService = !filters.servicio || filters.servicio === 'Todos' || regService === filters.servicio;

            const matchesDependency = !filters.dependencia || filters.dependencia === 'Todas' ||
                reg.dependencia === filters.dependencia || (reg.vinculacionEntidad?.dependencia?.nombre === filters.dependencia) || (reg.asignacion?.dependencia?.nombre === filters.dependencia);

            const regProgram = reg.programa?.nombre || reg.asignacion?.servicio?.programa?.nombre || 'Sin Programa';
            const matchesProgram = !filters.programa || filters.programa === 'Todos' || regProgram === filters.programa;

            const matchesStatus = filters.status === 'all' || reg.estado_auditoria === filters.status;
            const matchesPeriod = !filters.period || reg.periodo.startsWith(filters.period);

            const adminsInVinc = reg.vinculacionEntidad?.administraciones?.map(a => a.administrador_contrato_id.toString()) || [];
            const matchesAdmin = !filters.admin_contrato || filters.admin_contrato === 'Todos' || adminsInVinc.includes(filters.admin_contrato);
            
            // Note: gerencia/subgerencia are now filtered server-side in fetchRegistros
            // But if we want local check too for consistency:
            const regGerenciaId = reg.vinculacionEntidad?.dependencia?.subgerencia?.gerencia_id;
            const regSubgerenciaId = reg.vinculacionEntidad?.dependencia?.subgerencia_id;
            
            const matchesGerencia = filters.gerencia === 'Todas' || String(regGerenciaId) === String(filters.gerencia);
            const matchesSubgerencia = filters.subgerencia === 'Todas' || String(regSubgerenciaId) === String(filters.subgerencia);

            return matchesSearch && matchesStatus && matchesPeriod && matchesService && matchesDependency && matchesProgram && matchesAdmin && matchesGerencia && matchesSubgerencia;
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
                } else if (sortConfig.key === 'rut') {
                    aValue = a.usuario?.rut || '';
                    bValue = b.usuario?.rut || '';
                } else if (sortConfig.key === 'programa') {
                    aValue = a.programa?.nombre || '';
                    bValue = b.programa?.nombre || '';
                } else if (sortConfig.key === 'servicio') {
                    aValue = a.asignacion?.servicio?.nombre || a.vinculacionEntidad?.servicio?.nombre || '';
                    bValue = b.asignacion?.servicio?.nombre || a.vinculacionEntidad?.servicio?.nombre || '';
                } else if (sortConfig.key === 'dependencia') {
                    aValue = a.dependencia || a.asignacion?.dependencia?.nombre || '';
                    bValue = b.dependencia || a.asignacion?.dependencia?.nombre || '';
                } else if (sortConfig.key === 'estado_auditoria') {
                    aValue = a.estado_auditoria || '';
                    bValue = b.estado_auditoria || '';
                } else if (sortConfig.key === 'created_at') {
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                } else if (sortConfig.key === 'porcentaje_cumplimiento') {
                    aValue = parseFloat(a.porcentaje_cumplimiento) || 0;
                    bValue = parseFloat(b.porcentaje_cumplimiento) || 0;
                } else if (sortConfig.key === 'porcentaje_cumplimiento_auditor') {
                    aValue = a.porcentaje_cumplimiento_auditor !== null ? parseFloat(a.porcentaje_cumplimiento_auditor) : -1;
                    bValue = b.porcentaje_cumplimiento_auditor !== null ? parseFloat(b.porcentaje_cumplimiento_auditor) : -1;
                } else if (sortConfig.key === 'periodo') {
                    aValue = a.periodo || '';
                    bValue = b.periodo || '';
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

    const handleReabrirDirecto = (registroId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reabrir Registro',
            message: '¿Está seguro de reabrir este registro? Pasará a estado "Pendiente" y podrá ser editado nuevamente.',
            action: async () => {
                try {
                    await api.post('/reaperturas/directa', {
                        registro_id: registroId,
                        motivo: 'Reapertura directa por administración'
                    });
                    toast.success('Registro reabierto exitosamente');
                    fetchRegistros();
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Error al reabrir registro');
                }
            }
        });
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

    const generatePDF = async (registroSummary) => {
        const toastId = toast.loading('Generando reporte PDF...');
        try {
            // 1. Fetch Full Details
            const response = await api.get(`/registros/${registroSummary.id}`);
            const registro = response.data.data;

            // 2. Setup Doc
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width; // 210mm
            const pageHeight = doc.internal.pageSize.height; // 297mm
            const margin = 14;

            // Brand Colors
            const BRAND_ORANGE = [255, 102, 0]; // #FF6600
            const TEXT_GRAY = [107, 114, 128]; // #6b7280
            const TEXT_DARK = [17, 24, 39]; // #111827
            const BG_LIGHT_GRAY = [249, 250, 251]; // #f9fafb

            // Helper: Load Logo
            const loadImage = (src) => new Promise((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });
            const logo = await loadImage('/logo.png');

            // --- PAGE 1: HEADER & SUMMARY ---

            // Logo
            if (logo) {
                // Approximate aspect ratio preservation if needed, but fixed box is fine
                doc.addImage(logo, 'PNG', margin, 10, 40, 15);
            }

            // Period Box (Top Right)
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(pageWidth - 70 - margin, 10, 70, 20); // Box

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text('PERIODO REPORTADO', pageWidth - 35 - margin, 16, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            const spanishMonth = (() => {
                if (!registro.periodo) return 'N/A';
                const [y, m] = registro.periodo.split('-');
                return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase();
            })();
            doc.text(spanishMonth, pageWidth - 35 - margin, 24, { align: 'center' });

            // Orange Line Separator
            doc.setDrawColor(...BRAND_ORANGE);
            doc.setLineWidth(1);
            doc.line(margin, 35, pageWidth - margin, 35);

            let yPos = 45;

            // Summary Grid (Custom Implementation)
            const gridData = [
                { label: 'CONTRATISTA', value: registro.eecc_nombre || registro.usuario?.eecc_nombre || 'N/A' },
                { label: 'SERVICIO', value: registro.asignacion?.servicio?.nombre || registro.vinculacionEntidad?.servicio?.nombre || 'N/A' },
                { label: 'DEPENDENCIA', value: registro.dependencia || registro.asignacion?.dependencia?.nombre || 'N/A' },
                { label: 'PROGRAMA', value: registro.programa?.nombre || 'N/A' },
                { label: 'ESTADO AUDITORÍA', value: registro.estado_auditoria?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                { label: 'CUMPLIMIENTO DECLARADO', value: `${registro.porcentaje_cumplimiento}%`, isGreen: true }
            ];

            // Draw Grid
            const boxWidth = (pageWidth - (margin * 2)) / 3;
            const boxHeight = 14;

            doc.setDrawColor(229, 231, 235); // Gray-200
            doc.setLineWidth(0.1);

            gridData.forEach((item, index) => {
                const row = Math.floor(index / 3);
                const col = index % 3;
                const x = margin + (col * boxWidth);
                const y = yPos + (row * boxHeight);

                // Border
                doc.rect(x, y, boxWidth, boxHeight);

                // Label
                doc.setFontSize(6);
                doc.setTextColor(156, 163, 175); // Gray-400
                doc.setFont('helvetica', 'bold');
                doc.text(item.label, x + 2, y + 4);

                // Value
                doc.setFontSize(9);
                if (item.isGreen) doc.setTextColor(22, 163, 74); // Green-600
                else doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(String(item.value), x + 2, y + 10);
            });

            yPos += (boxHeight * 2) + 10;

            // RESULTADO DE AUDITORIA Section
            doc.setFontSize(11);
            doc.setTextColor(...BRAND_ORANGE);
            doc.setFont('helvetica', 'bold');
            doc.text('RESULTADO DE AUDITORIA', margin, yPos);
            yPos += 5;

            // Green Result Box
            const resBoxHeight = 18;
            doc.setFillColor(240, 253, 244); // Green-50
            doc.setDrawColor(187, 247, 208); // Green-200
            doc.roundedRect(margin, yPos, pageWidth - (margin * 2), resBoxHeight, 2, 2, 'FD');

            // Inside Result Box
            const resY = yPos + 4;
            // Headers
            doc.setFontSize(6);
            doc.setTextColor(156, 163, 175);
            doc.text('AUDITOR RESPONSABLE', margin + 5, resY);
            doc.text('FECHA REVISIÓN', margin + 60, resY);
            doc.text('RESULTADO FINAL', margin + 110, resY);

            // Values
            const resValY = resY + 5;
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(registro.auditor?.name?.toUpperCase() || 'NO ASIGNADO', margin + 5, resValY);

            const fechaAudit = registro.fecha_auditoria
                ? new Date(registro.fecha_auditoria).toLocaleDateString('es-CL')
                : new Date().toLocaleDateString('es-CL'); // Fallback to now if not set
            doc.text(fechaAudit, margin + 60, resValY);

            const finalScore = registro.porcentaje_cumplimiento_auditor !== null
                ? `${registro.porcentaje_cumplimiento_auditor}%`
                : 'PENDIENTE';

            doc.setFontSize(10);
            doc.setTextColor(22, 163, 74); // Green
            doc.text(finalScore, margin + 110, resValY);

            // Auditado Badge (Right side of box)
            if (registro.porcentaje_cumplimiento_auditor !== null) {
                doc.setFillColor(220, 252, 231); // Green-100
                doc.setDrawColor(220, 252, 231);
                doc.roundedRect(pageWidth - margin - 30, yPos + 4, 25, 6, 1, 1, 'FD');
                doc.setFontSize(7);
                doc.setTextColor(22, 101, 52); // Green-800
                doc.text('AUDITADO', pageWidth - margin - 17.5, yPos + 8, { align: 'center' });
            }

            yPos += resBoxHeight + 10;

            // --- DETALLE DE AUDITORIA Table ---
            doc.setFontSize(11);
            doc.setTextColor(...BRAND_ORANGE);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALLE DE AUDITORIA', margin, yPos);
            yPos += 2;

            // Prepare Table Data with Grouping
            const tableBody = [];

            if (registro.actividades) {
                // Sort by Element ID
                const sortedActs = [...registro.actividades].sort((a, b) => (a.elemento_id || 0) - (b.elemento_id || 0));

                let lastElementId = -1;

                sortedActs.forEach(act => {
                    // Inject Group Header if new element
                    if (act.elemento_id !== lastElementId) {
                        const elemName = act.elemento?.nombre || 'General';
                        // Add a special row for styling later
                        tableBody.push([{ content: `ELEMENTO ${act.elemento_id}: ${elemName}`, colSpan: 6, styles: { fillColor: [229, 231, 235], fontStyle: 'bold', textColor: [0, 0, 0] } }]);
                        lastElementId = act.elemento_id;
                    }

                    tableBody.push([
                        act.actividad_id || '-', // ID
                        act.actividad?.codigo || '-', // Código
                        act.actividad?.nombre || act.descripcion_actividad, // Nombre
                        act.cumple ? 'CUMPLE' : 'NO CUMPLE', // Estado Real
                        act.cumple_auditor === true ? 'CUMPLE' : (act.cumple_auditor === false ? 'NO CUMPLE' : ''), // Auditor
                        act.observacion_auditor || '' // Obs
                    ]);
                });
            }

            autoTable(doc, {
                startY: yPos + 4,
                head: [['ID', 'CÓDIGO', 'ELEMENTO / ACTIVIDAD', 'ESTADO', 'AUDITOR', 'OBS. AUDITOR']],
                body: tableBody,
                theme: 'plain',
                styles: {
                    fontSize: 7,
                    cellPadding: 3,
                    lineColor: [243, 244, 246],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [249, 250, 251],
                    textColor: [107, 114, 128],
                    fontSize: 6,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    0: { width: 10, textColor: [156, 163, 175] }, // ID
                    1: { width: 15, fontStyle: 'bold' }, // Codigo (Badge look?)
                    2: { width: 80 }, // Nombre
                    3: { width: 20, halign: 'center' }, // Estado
                    4: { width: 20, halign: 'center' }, // Auditor
                    5: { width: 35, fontStyle: 'italic', textColor: [107, 114, 128] } // Obs
                },
                didDrawCell: (data) => {
                    // Custom Badges for State/Auditor columns (indices 3 and 4)
                    if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
                        const text = data.cell.raw;
                        if (!text) return;

                        // Don't draw default text
                        // We will draw it manually
                    }
                },
                willDrawCell: (data) => {
                    // Check if it's a Badge Cell
                    if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4) && data.cell.raw && typeof data.cell.raw === 'string' && !data.row.raw[0].colSpan) {
                        const text = data.cell.raw;
                        if (text === 'CUMPLE') {
                            doc.setFillColor(220, 252, 231); // Green-100
                            doc.setTextColor(22, 101, 52); // Green-800
                        } else if (text === 'NO CUMPLE') {
                            doc.setFillColor(254, 226, 226); // Red-100
                            doc.setTextColor(153, 27, 27); // Red-800
                        } else {
                            return; // empty
                        }

                        // Draw Badge Rect
                        const { x, y, width, height } = data.cell;
                        const pad = 1;
                        doc.roundedRect(x + pad, y + pad + 1, width - (pad * 2), height - (pad * 2) - 2, 1, 1, 'F');

                        // Draw Text Centered
                        doc.setFontSize(6);
                        doc.setFont('helvetica', 'bold');
                        doc.text(text, x + width / 2, y + height / 2 + 1.5, { align: 'center' });

                        // HACK: Prevent default text drawing by setting text color to transparent or empty? 
                        // jspdf-autotable doesn't have an easy "cancel draw text" in willDrawCell for specific cells without hooks.
                        // Actually, if we return false/undefined it proceeds. 
                        // The didDrawCell hook is for AFTER. willDrawCell is BEFORE.
                        // To hide original text, we can set cell text to empty string in willDrawCell or modify styles.
                        data.cell.text = []; // Clear text so it doesn't draw over our badge
                    }
                }
            });

            // --- PAGE BREAK / TRACEABILITY ---
            doc.addPage();

            // Header Repeater (Logo + Period on Page 2?) - Design shows Logo + Period on Page 2 and 3 as well.
            if (logo) doc.addImage(logo, 'PNG', margin, 10, 40, 15);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(pageWidth - 70 - margin, 10, 70, 20);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('PERIODO REPORTADO', pageWidth - 35 - margin, 16, { align: 'center' });
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(spanishMonth, pageWidth - 35 - margin, 24, { align: 'center' });

            yPos = 45;

            doc.setFontSize(11);
            doc.setTextColor(...BRAND_ORANGE);
            doc.setFont('helvetica', 'bold');
            doc.text('HISTORIAL DE TRAZABILIDAD', margin, yPos);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(156, 163, 175);
            doc.text('Registro cronológico de acciones realizadas sobre este documento.', margin, yPos + 4);
            yPos += 8;

            // Traceability Table
            const logsData = registro.logs ? registro.logs.map(log => [
                new Date(log.created_at).toLocaleString('es-CL'),
                log.usuario?.name || 'Sistema',
                (log.accion === 'FINALIZAR_AUDITORIA' ? 'Auditoría Completada' : log.accion).replace('_', ' '),
                log.descripcion
            ]) : [];

            autoTable(doc, {
                startY: yPos,
                head: [['FECHA / HORA', 'USUARIO', 'ACCIÓN', 'DESCRIPCIÓN']],
                body: logsData,
                theme: 'striped',
                headStyles: {
                    fillColor: [243, 232, 255], // Light Purple from image
                    textColor: [107, 33, 168], // Dark Purple
                    fontSize: 7,
                    fontStyle: 'bold'
                },
                styles: { fontSize: 7, cellPadding: 3 },
                columnStyles: {
                    0: { width: 30, textColor: [156, 163, 175] },
                    1: { width: 40, fontStyle: 'bold' },
                    2: { width: 40, textColor: [124, 58, 237], fontStyle: 'bold' }, // Purple Action
                    3: { width: 'auto' }
                }
            });

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

                doc.text('Abastible S.A. - Control Operacional', margin, pageHeight - 8);
                doc.text(`Pág. ${i} - Generado: ${new Date().toLocaleString('es-CL')}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            }

            // Save
            doc.save(`Reporte_Cumplimiento_${registro.id}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('Reporte generado exitosamente', { id: toastId });

        } catch (err) {
            console.error('PDF Generation Error:', err);
            toast.error('Error al generar el PDF', { id: toastId });
        }
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
                {canWrite('Registros') && !isContractor && (
                    <Link id="btn-nuevo-registro" to="/registros/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <Plus size={18} /> Nuevo Registro
                    </Link>
                )}
            </header>

            {/* Filters Bar */}
            <div className="filters-grid" style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '12px', 
                alignItems: 'flex-end', 
                background: '#f9fafb', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #e5e7eb' 
            }}>
                <div className="form-group" style={{ width: '180px' }}>
                    <label>Gerencia</label>
                    <select id="filter-gerencia" className="form-control" value={filters.gerencia} onChange={e => setFilters({ ...filters, gerencia: e.target.value, subgerencia: 'Todas' })}>
                        <option value="Todas">Todas</option>
                        {gerencias.map(g => (
                            <option key={g.id} value={g.id}>{g.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ width: '180px' }}>
                    <label>Subgerencia</label>
                    <select id="filter-subgerencia" className="form-control" value={filters.subgerencia} onChange={e => setFilters({ ...filters, subgerencia: e.target.value })}>
                        <option value="Todas">Todas</option>
                        {filteredSubgerencias.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>Contratista / RUT</label>
                    <input
                        id="filter-search"
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre o RUT..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>


                <div className="form-group" style={{ width: '150px' }}>
                    <label>Servicio</label>
                    <select id="filter-servicio" className="form-control" value={filters.servicio || 'Todos'}
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
                    <select id="filter-dependencia" className="form-control" value={filters.dependencia || 'Todas'} onChange={e => setFilters({ ...filters, dependencia: e.target.value })}>
                        <option value="Todas">Todas</option>
                        {dependencies.map(d => (
                            <option key={d.id} value={d.nombre}>{d.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ width: '150px' }}>
                    <label>Programa</label>
                    <select id="filter-programa" className="form-control" value={filters.programa || 'Todos'} onChange={e => setFilters({ ...filters, programa: e.target.value })}>
                        <option value="Todos">Todos</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.nombre}>{p.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ width: '140px' }}>
                    <label>Estado Auditoría</label>
                    <select id="filter-status" className="form-control" value={filters.status || 'all'} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                        <option value="all">Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="auditable">Auditable</option>
                        <option value="auditando">En Proceso</option>
                        <option value="auditada">Auditada</option>
                        <option value="pendiente_subsanacion">Pendiente Subsanación</option>
                        <option value="subsanado">Subsanado</option>
                        <option value="en_revision">En Revisión</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="reapertura_solicitada">Reapertura Solicitada</option>
                    </select>
                </div>

                <div className="form-group" style={{ width: '160px' }}>
                    <label>Periodo</label>
                    <input
                        id="filter-period"
                        type="month"
                        className="form-control"
                        value={filters.period}
                        onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                    />
                </div>
                <div className="form-group" style={{ width: '140px' }}>
                    <label>Admin Contrato</label>
                    <select id="filter-admin" className="form-control" value={filters.admin_contrato || 'Todos'} onChange={e => setFilters({ ...filters, admin_contrato: e.target.value })}>
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
                        setFilters({ 
                            search: '', period: '', status: 'all', servicio: 'Todos', 
                            dependencia: 'Todas', programa: 'Todos', admin_contrato: 'Todos',
                            gerencia: 'Todas', subgerencia: 'Todas'
                        });
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
                <PendingRegistersWidget vinculacion={myVinculacion} />
            )}

            {/* Data Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th onClick={() => handleSort('periodo')} style={{ cursor: 'pointer' }}>MES INFORMADO {sortConfig.key === 'periodo' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('eecc_nombre')} style={{ cursor: 'pointer' }}>CONTRATISTA {sortConfig.key === 'eecc_nombre' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('rut')} style={{ cursor: 'pointer' }}>RUT {sortConfig.key === 'rut' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('programa')} style={{ cursor: 'pointer' }}>PROGRAMA {sortConfig.key === 'programa' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('servicio')} style={{ cursor: 'pointer' }}>SERVICIO {sortConfig.key === 'servicio' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('dependencia')} style={{ cursor: 'pointer' }}>DEPENDENCIA {sortConfig.key === 'dependencia' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th style={{ textAlign: 'center' }}>DOTACIÓN<br />TOTAL</th>
                            <th style={{ textAlign: 'center' }}>PERSONAS<br />NUEVAS</th>
                            <th onClick={() => handleSort('porcentaje_cumplimiento')} style={{ textAlign: 'center', cursor: 'pointer' }}>%<br />CONTRATISTA {sortConfig.key === 'porcentaje_cumplimiento' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th onClick={() => handleSort('porcentaje_cumplimiento_auditor')} style={{ textAlign: 'center', cursor: 'pointer' }}>%<br />AUDITORÍA {sortConfig.key === 'porcentaje_cumplimiento_auditor' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th style={{ textAlign: 'center' }}>% PROMEDIO<br />AÑO</th>
                            <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>FECHA ENVÍO {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th>ADMIN<br />CONTRATO</th>
                            <th>AUDITORÍA</th>
                            <th onClick={() => handleSort('estado_auditoria')} style={{ textAlign: 'center', cursor: 'pointer' }}>ESTADO {sortConfig.key === 'estado_auditoria' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                            <th style={{ textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRegistros.length === 0 ? (
                            <tr>
                                <td colSpan={16} className="empty-row">No se encontraron registros coincidentes.</td>
                            </tr>
                        ) : (
                            sortedRegistros.map((registro, idx) => (
                                <tr key={registro.id} id={`row-${registro.id}`} data-status={registro.estado_auditoria}>
                                    <td style={{ fontWeight: 500, color: '#6b7280', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {idx + 1}
                                    </td>
                                    <td style={{ borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <div style={{ fontWeight: 500 }}>
                                            {registro.periodo ? (() => {
                                                const [y, m] = registro.periodo.split('-');
                                                return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
                                            })() : '-'}
                                        </div>
                                    </td>
                                    <td style={{ borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>
                                            {registro.eecc_nombre || registro.usuario?.eecc_nombre || '-'}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {registro.usuario?.rut || '-'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {registro.programa?.nombre || 'Sin Programa'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {registro.vinculacionEntidad?.servicio?.nombre || 'N/A'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', borderBottom: '3px solid var(--color-brand-primary)' }}>{registro.dependencia || '-'}</td>
                                    <td style={{ textAlign: 'center', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {registro.dotacion_total || 0}
                                    </td>
                                    <td style={{ textAlign: 'center', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {registro.personas_nuevas || 0}
                                    </td>
                                    <td style={{ textAlign: 'center', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <span className={`badge ${getPorcentajeBadgeClass(registro.porcentaje_cumplimiento)}`}>
                                            {registro.porcentaje_cumplimiento}%
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {/* Mockup shows distinct style for Audit % */}
                                        <span className="badge badge--percent-audit">
                                            {registro.porcentaje_cumplimiento_auditor !== null ? `${registro.porcentaje_cumplimiento_auditor}%` : '-'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>
                                            {getAnnualAverage(registro)}%
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#6b7280', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {new Date(registro.created_at).toLocaleDateString('es-CL')} <br />
                                        {new Date(registro.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ fontSize: '0.8rem', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <span style={{ color: '#6366f1', fontWeight: 500 }}>
                                            {registro.vinculacionEntidad?.administraciones?.map(a => a.administradorContrato?.name).filter(Boolean).join(', ') || '-'}
                                        </span>
                                    </td>
                                    <td style={{ borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <span className={registro.tipo_auditoria === 'terreno' ? 'badge--audit-terreno' : 'badge--audit-sistema'}>
                                            {registro.tipo_auditoria === 'terreno' ? <Building size={12} /> : <Monitor size={12} />}
                                            {registro.tipo_auditoria === 'terreno' ? 'Terreno' : 'Sistema'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        {(() => {
                                            const status = registro.estado_auditoria;
                                            let label = 'Pendiente';
                                            let style = { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }; // Gray

                                            if (status === 'auditable') {
                                                label = 'Auditable';
                                                style = { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }; // Yellow
                                            } else if (status === 'auditando') {
                                                label = 'En Proceso';
                                                style = { background: '#eff6ff', color: '#003594', border: '1px solid #dbeafe' }; // Blue
                                            } else if (status === 'auditada') {
                                                label = 'Auditada';
                                                style = { background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }; // Green
                                            } else if (status === 'reabierto') {
                                                label = 'Reabierto';
                                                style = { background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }; // Orange
                                            } else if (status === 'subsanado') {
                                                label = 'Subsanado';
                                                style = { background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }; // Purple
                                            } else if (status === 'en_revision') {
                                                label = 'En Revisión';
                                                style = { background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }; // Sky
                                            } else if (status === 'finalizado') {
                                                label = 'Finalizado';
                                                style = { background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }; // Green
                                            } else if (status === 'reapertura_solicitada' || status === 'reapertura_pendiente') {
                                                label = 'Reapertura Solicitada';
                                                style = { background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }; // Red
                                            } else if (status === 'pendiente_subsanacion' || status === 'reabierto') {
                                                label = 'Pendiente Subsanación';
                                                style = { background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }; // Orange
                                            }

                                            return (
                                                <span className="badge" style={{ ...style, fontSize: '0.75rem', padding: '4px 8px' }}>
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="actions-cell" style={{ borderBottom: '3px solid var(--color-brand-primary)' }}>
                                        <div className="flex flex-col gap-1 items-end">
                                            {/* Action: Audit (US-003) - Admin Contrato / Admin Only & Auditable Status (PARKO) */}
                                            {(isAdmin || user?.role === 'administrador_contrato') && ['auditable', 'auditando'].includes(registro.estado_auditoria) && (
                                                <Link id={`btn-audit-${registro.id}`} to={`/registros/${registro.id}/auditar`} className="btn-action btn-auditar" title="Auditar Registro">
                                                    <ClipboardCheck size={14} /> <span>{registro.estado_auditoria === 'auditando' ? 'Continuar Auditoría' : 'Auditar'}</span>
                                                </Link>
                                            )}

                                            {/* Action: Review Subsanacion (PARKO) - Admin Contrato / Admin Only & Subsanado Status */}
                                            {(isAdmin || user?.role === 'administrador_contrato') && ['subsanado', 'en_revision'].includes(registro.estado_auditoria) && (
                                                <Link id={`btn-review-${registro.id}`} to={`/registros/${registro.id}/auditar`} className="btn-action btn-auditar" style={{ background: 'var(--color-brand-primary)', borderColor: 'var(--color-brand-primary)' }} title="Revisar Subsanación">
                                                    <Check size={14} /> <span>{registro.estado_auditoria === 'en_revision' ? 'Continuar Revisión' : 'Revisar Subsanación'}</span>
                                                </Link>
                                            )}

                                            {/* Action: Edit - Contractor Only & Allowed states */}
                                            {['contratista_admin', 'contratista_user'].includes(user?.role) &&
                                                (registro.estado_auditoria === 'pendiente' || registro.estado_auditoria === 'pendiente_subsanacion' || registro.estado_auditoria === 'reabierto') && (
                                                    <Link id={`btn-edit-${registro.id}`} to={`/registros/${registro.id}`} className="btn-action" title="Editar Registro">
                                                        <Edit2 size={14} /> <span>{registro.estado_auditoria === 'pendiente' ? 'Editar' : 'Subsanar'}</span>
                                                    </Link>
                                                )}

                                            {/* Action: View (Read Only) - Available to ALL */}
                                            <Link
                                                to={`/registros/${registro.id}`}
                                                state={{ readonly: true }}
                                                className="btn-action"
                                                title="Ver Detalle"
                                                style={{ color: '#6b7280', borderColor: '#d1d5db' }}
                                            >
                                                <Eye size={14} /> <span>Ver</span>
                                            </Link>

                                            {/* Action: PDF */}
                                            {canExec('Registros_Exportar') && (
                                                <button onClick={() => generatePDF(registro)} className="btn-action btn-pdf" title="Descargar PDF">
                                                    <FileText size={14} /> <span>PDF</span>
                                                </button>
                                            )}

                                            {/* Action: Traceability */}
                                            <button
                                                onClick={() => {
                                                    setSelectedRegistroId(registro.id);
                                                    setTracePanelOpen(true);
                                                }}
                                                className="btn-action btn-traza"
                                                title="Ver Trazabilidad"
                                            >
                                                <List size={14} /> <span>Trazabilidad</span>
                                            </button>

                                            {/* Action: Solicitar Reapertura (Only Closed & Audited, only Contractors) */}
                                            {(['contratista_user', 'contratista_admin'].includes(user?.role) && ['auditado', 'auditada'].includes(registro.estado_auditoria)) && (
                                                <button
                                                    onClick={() => openReaperturaModal(registro.id)}
                                                    className="btn-action"
                                                    title="Solicitar Reapertura"
                                                    style={{ color: '#d97706', borderColor: '#d97706' }}
                                                >
                                                    <Lock size={14} /> <span>Solicitar Reapertura</span>
                                                </button>
                                            )}

                                            {/* Action: Reabrir Directo (Admin/ADC) */}
                                            {isAdminOrADC && (registro.cerrado === 1 || ['auditado', 'auditada'].includes(registro.estado_auditoria)) && (
                                                <button
                                                    onClick={() => handleReabrirDirecto(registro.id)}
                                                    className="btn-action"
                                                    title="Reabrir Registro"
                                                    style={{ color: '#10b981', borderColor: '#10b981' }}
                                                >
                                                    <RefreshCw size={14} /> <span>Reabrir</span>
                                                </button>
                                            )}

                                            {/* Action: Compromisos */}
                                            <button
                                                onClick={() => {
                                                    setSelectedRegistroId(registro.id);
                                                    setShowCompromisos(true);
                                                }}
                                                className="btn-action"
                                                title="Ver Compromisos"
                                                style={{ color: '#0ea5e9', borderColor: '#0ea5e9' }}
                                            >
                                                <ClipboardCheck size={14} /> <span>Compromisos</span>
                                            </button>

                                            {/* Action: Delete (Admin/Exec) */}
                                            {canExec('Registros') && (
                                                <button
                                                    onClick={() => handleDelete(registro.id)}
                                                    className="btn-action"
                                                    title="Eliminar Registro"
                                                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                                >
                                                    <Trash2 size={14} /> <span>Eliminar</span>
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

            {/* Modal Compromisos */}
            {showCompromisos && (
                <CompromisosModal
                    registroId={selectedRegistroId}
                    onClose={() => setShowCompromisos(false)}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div>
    );
}

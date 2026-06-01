// IEEE Trace: REQ-002 | US-002 | pages/registros/RegistroForm.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Save, ArrowLeft, ClipboardCheck, FileText, RefreshCw, Lock, CheckCircle, Trash2, Clock, AlertTriangle, User, Download } from 'lucide-react';
import FileUpload from '../../components/forms/FileUpload';
import HallazgoModal from '../../components/forms/HallazgoModal';
import HallazgoList from '../../components/forms/HallazgoList';
import CompromisoModal from '../../components/forms/CompromisoModal';
import SolicitudReaperturaModal from '../../components/forms/SolicitudReaperturaModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import { toast } from 'react-hot-toast';
import '../compromisos/CompromisoList.css';

export default function RegistroForm() {
    const { id } = useParams();
    const [searchParams] = useSearchParams(); // NEW
    const { user, isAdmin, canWrite } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isEdit = Boolean(id);
    const isReadOnly = location.state?.readonly || false;

    const isContractor = ['contratista_admin', 'contratista_user'].includes(user?.role);
    const isAdminOrADC = isAdmin || user?.role === 'administrador_contrato';

    const [form, setForm] = useState({
        periodo: new Date().toISOString().slice(0, 7), // YYYY-MM format
        personas_nuevas: 0,
        supervisores: 0,
        prevencionistas: 0,
        dotacion_total: 0,
        eecc_nombre: ''
    });
    // ... (rest of state items are same)
    const [actividades, setActividades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hallazgoModal, setHallazgoModal] = useState({ show: false, actividad: null, hallazgo: null });
    const [compromisoModal, setCompromisoModal] = useState({ show: false, hallazgo: null });
    const [reaperturaModal, setReaperturaModal] = useState({ show: false });
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });
    const [registroCerrado, setRegistroCerrado] = useState(false);
    const isLocked = isReadOnly || (isAdminOrADC 
        ? ['auditada', 'finalizado'].includes(form.estado_auditoria) 
        : (registroCerrado && !['pendiente', 'pendiente_subsanacion', 'reabierto'].includes(form.estado_auditoria)));
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        action: null,
        title: '',
        message: ''
    });

    // === Color Theme from Navbar Circles ===
    const [registroTheme, setRegistroTheme] = useState('orange');

    useEffect(() => {
        const handler = (e) => setRegistroTheme(e.detail.theme);
        window.addEventListener('registro-theme-change', handler);
        return () => window.removeEventListener('registro-theme-change', handler);
    }, []);

    const scrollToFinding = (hallazgoId) => {
        const element = document.getElementById(`finding-${hallazgoId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Temporary highlight effect
            const originalBg = element.style.backgroundColor;
            const originalShadow = element.style.boxShadow;
            const originalBorder = element.style.borderColor;

            element.style.backgroundColor = '#fee2e2';
            element.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
            element.style.borderColor = '#ef4444';

            setTimeout(() => {
                element.style.backgroundColor = originalBg || '#fffafb';
                element.style.boxShadow = originalShadow || 'none';
                element.style.borderColor = originalBorder || '#fee2e2';
            }, 2500);
        }
    };

    const allHallazgos = useMemo(() => {
        return actividades.flatMap(act => 
            (act.hallazgos || []).map(h => ({
                ...h,
                actividad_nombre: act.descripcion || act.actividad?.nombre || `Actividad ${act.actividad_id}`,
                actividad_codigo: act.codigo
            }))
        );
    }, [actividades]);

    const themeColors = useMemo(() => {
        switch (registroTheme) {
            case 'blue':
                return {
                    headerBg: '#003594',
                    pageBg: '#ffffff',
                    cardBg: '#ffffff',
                    textPrimary: '#111827',
                    textSecondary: '#6b7280',
                    textOnHeader: '#ffffff',
                    border: '#e5e7eb',
                    inputBg: '#f3f4f6',
                    inputBorder: '#e5e7eb',
                    inputText: '#374151',
                    tableHeadBg: '#f9fafb',
                    tableHeadColor: '#6b7280',
                    footerBg: 'white',
                    accentLight: '#eff6ff',
                    progressTrackBg: '#f3f4f6',
                };
            case 'dark':
                return {
                    headerBg: '#374151',
                    pageBg: '#111827',
                    cardBg: '#1f2937',
                    textPrimary: '#f9fafb',
                    textSecondary: '#9ca3af',
                    textOnHeader: '#f9fafb',
                    border: '#374151',
                    inputBg: '#374151',
                    inputBorder: '#4b5563',
                    inputText: '#f3f4f6',
                    tableHeadBg: '#1f2937',
                    tableHeadColor: '#9ca3af',
                    footerBg: '#1f2937',
                    accentLight: '#1e3a5f',
                    progressTrackBg: '#374151',
                };
            default: // orange
                return {
                    headerBg: '#fe5000',
                    pageBg: '#ffffff',
                    cardBg: '#ffffff',
                    textPrimary: '#111827',
                    textSecondary: '#6b7280',
                    textOnHeader: '#ffffff',
                    border: '#e5e7eb',
                    inputBg: '#f3f4f6',
                    inputBorder: '#e5e7eb',
                    inputText: '#374151',
                    tableHeadBg: '#f9fafb',
                    tableHeadColor: '#6b7280',
                    footerBg: 'white',
                    accentLight: '#eff6ff',
                    progressTrackBg: '#f3f4f6',
                };
        }
    }, [registroTheme]);

    // New State for Contractor Selection
    const [contractors, setContractors] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedContractor, setSelectedContractor] = useState(null);
    const [searchNombre, setSearchNombre] = useState('');
    const [searchRut, setSearchRut] = useState('');


    const [reviewComments, setReviewComments] = useState('');
    const [generalCommitments, setGeneralCommitments] = useState([]);
    
    // States for Commitment Fulfillment Uploads
    const [evidenceFiles, setEvidenceFiles] = useState({});
    const [evidenceComments, setEvidenceComments] = useState({});
    const [uploadingCompromisoId, setUploadingCompromisoId] = useState(null);

    const handleContractorSelect = (contractor) => {
        setSelectedContractor(contractor.id);
        setSearchNombre(contractor.nombre);
        setSearchRut(contractor.rut);
        setShowNombreDropdown(false);
        setShowRutDropdown(false);
        // Reset assignment when contractor changes
        setForm(prev => ({ ...prev, contratista_asignacion_id: '' }));
    };

    const clearContractor = () => {
        setSelectedContractor(null);
        setSearchNombre('');
        setSearchRut('');
        setAssignments([]);
        setForm(prev => ({ ...prev, contratista_asignacion_id: '' }));
    };

    const filteredByNombre = contractors.filter(c =>
        c.nombre.toLowerCase().includes(searchNombre.toLowerCase())
    );
    const filteredByRut = contractors.filter(c =>
        c.rut.toLowerCase().includes(searchRut.toLowerCase())
    );

    useEffect(() => {
        if (!user) return;

        const initData = async () => {
            try {
                if (user.role === 'admin' || user.role === 'administrador_contrato') {
                    // Fetch contractor COMPANIES (Contratista entities, not individual users)
                    const response = await api.get('/contratistas');
                    setContractors(response.data.data);
                } else {
                    // Contractor user: fetch own profile to get associated company
                    const response = await api.get(`/usuarios/${user.id}`);
                    const userData = response.data.data;
                    if (userData.contratistaEntidad) {
                        setContractors([userData.contratistaEntidad]);
                        setSelectedContractor(userData.contratistaEntidad.id);
                        setSearchNombre(userData.contratistaEntidad.nombre);
                        setSearchRut(userData.contratistaEntidad.rut);
                    } else if (user.parent_id) {
                        // Fallback: check parent user for company association
                        const parentResp = await api.get(`/usuarios/${user.parent_id}`);
                        if (parentResp.data.data.contratistaEntidad) {
                            setContractors([parentResp.data.data.contratistaEntidad]);
                            setSelectedContractor(parentResp.data.data.contratistaEntidad.id);
                            setSearchNombre(parentResp.data.data.contratistaEntidad.nombre);
                            setSearchRut(parentResp.data.data.contratistaEntidad.rut);
                        }
                    }
                }
            } catch (err) {
                console.error('Error initializing contractor data:', err);
            }
        };

        initData();

        fetchActividades();
        if (isEdit) {
            fetchRegistro();
        }
    }, [id, user, isEdit]);

    // Load vinculaciones (assignments) when a Contratista company is selected
    useEffect(() => {
        if (!selectedContractor) return;
        const selected = contractors.find(c => String(c.id) === String(selectedContractor));
        if (selected && selected.vinculaciones) {
            setAssignments(selected.vinculaciones);

            // PRE-FILL LOGIC from Query Params or Auto-select
            const prePeriodo = searchParams.get('periodo');
            const preVinculacionId = searchParams.get('vinculacion_id');

            if (!isEdit && preVinculacionId) {
                // Check if the pre-filled ID exists in the loaded assignments
                const targetAssignment = selected.vinculaciones.find(v => String(v.id) === String(preVinculacionId));
                if (targetAssignment) {
                    setForm(prev => ({
                        ...prev,
                        contratista_asignacion_id: targetAssignment.id,
                        periodo: prePeriodo || prev.periodo
                    }));
                }
            } else if (selected.vinculaciones.length === 1 && !form.contratista_asignacion_id) {
                setForm(prev => ({ ...prev, contratista_asignacion_id: selected.vinculaciones[0].id }));
            }
        } else {
            setAssignments([]);
        }
    }, [selectedContractor, contractors, searchParams, isEdit]);

    // Auto-set programa_id and reload actividades when assignment (vinculacion) changes
    useEffect(() => {
        if (!form.contratista_asignacion_id || assignments.length === 0) return;
        const vinculacion = assignments.find(a => String(a.id) === String(form.contratista_asignacion_id));
        if (vinculacion && vinculacion.servicio && vinculacion.servicio.programa_id) {
            const programaId = vinculacion.servicio.programa_id;
            setForm(prev => ({ ...prev, programa_id: programaId }));
            
            // BUG FIX: In edit mode, we don't want to overwrite already loaded activities
            // since fetchRegistro already populated them.
            if (isEdit) return;
            
            fetchActividades(programaId);
        }
    }, [form.contratista_asignacion_id, assignments, isEdit]);

    const handleCompromisoClick = (hallazgo) => {
        setCompromisoModal({ show: true, hallazgo });
    };

    const handleCompromisoSuccess = (newCompromiso) => {
        // Update local state to reflect the new compromiso
        const updated = actividades.map(a => {
            const hallazgoIndex = a.hallazgos ? a.hallazgos.findIndex(h => h.id === newCompromiso.hallazgo_id) : -1;
            if (hallazgoIndex !== -1) {
                const newHallazgos = [...a.hallazgos];
                const hallazgo = newHallazgos[hallazgoIndex];
                hallazgo.compromisos = [newCompromiso];
                newHallazgos[hallazgoIndex] = hallazgo;
                return { ...a, hallazgos: newHallazgos };
            }
            return a;
        });
        setActividades(updated);
    };

    const openHallazgoModal = (actividad) => {
        setHallazgoModal({ show: true, actividad });
    };

    const handleHallazgoSuccess = (newHallazgo) => {
        const updated = actividades.map(a => {
            if (a.id === newHallazgo.registro_actividad_id) {
                const existingIndex = a.hallazgos.findIndex(h => h.id === newHallazgo.id);
                let newHallazgos = [...(a.hallazgos || [])];

                if (existingIndex >= 0) {
                    newHallazgos[existingIndex] = newHallazgo;
                } else {
                    newHallazgos.push(newHallazgo);
                }

                return { ...a, hallazgos: newHallazgos };
            }
            return a;
        });
        setActividades(updated);
    };

    const handleHallazgoEdit = (hallazgo, actividad) => {
        setHallazgoModal({ show: true, actividad, hallazgo });
    };

    const handleHallazgoDelete = async (hallazgoId, actividadId) => {
        if (!window.confirm('¿Está seguro de eliminar este hallazgo?')) return;
        try {
            await api.delete(`/hallazgos/${hallazgoId}`);
            const updated = actividades.map(a => {
                if (a.id === actividadId) {
                    return {
                        ...a,
                        hallazgos: a.hallazgos.filter(h => h.id !== hallazgoId)
                    };
                }
                return a;
            });
            setActividades(updated);
        } catch (err) {
            console.error(err);
            alert('Error al eliminar hallazgo');
        }
    };

    const handleEvidenciaDelete = async (evidenciaId, actividadIndex) => {
        if (!window.confirm('¿Está seguro de eliminar esta evidencia? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/evidencias/${evidenciaId}`);
            
            setActividades(prev => prev.map((act, i) => {
                if (i === actividadIndex) {
                    const newEvidencias = act.evidencias.filter(e => e.id !== evidenciaId);
                    // Special behavior: If it's the last evidence and it was required, user might want to change back to No Cumple
                    // but we won't force it here, just update the list.
                    return { ...act, evidencias: newEvidencias };
                }
                return act;
            }));
            
            toast.success('Evidencia eliminada correctamente');
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar la evidencia');
        }
    };

    const handlePendingFileDelete = (actividadIndex, fileIndex) => {
        setActividades(prev => prev.map((act, i) => {
            if (i === actividadIndex) {
                const newFiles = act.pendingFiles.filter((_, idx) => idx !== fileIndex);
                return { ...act, pendingFiles: newFiles };
            }
            return act;
        }));
    };

    const fetchActividades = async (programaId) => {
        try {
            const url = programaId ? `/actividades?programa_id=${programaId}` : '/actividades';
            const response = await api.get(url);
            const acts = response.data.data.map(a => ({
                actividad_id: a.id,
                codigo: a.codigo,
                descripcion: a.descripcion,
                criterios: a.criterios,
                frecuencia: a.frecuencia,
                requiere_evidencia: a.requiere_evidencia,
                template_url: a.template_url, // Include template_url
                elemento: a.elemento, // Include entire elemento object
                cumple: false,
                responsable: '',
                descripcion_contratista: ''
            }));
            setActividades(acts);
        } catch (err) {
            console.error('Error loading actividades');
        }
    };

    const fetchRegistro = async () => {
        try {
            const response = await api.get(`/registros/${id}`);
            const data = response.data.data;
            setForm({
                periodo: data.periodo ? data.periodo.substring(0, 7) : '',
                personas_nuevas: data.personas_nuevas,
                supervisores: data.supervisores,
                prevencionistas: data.prevencionistas,
                dotacion_total: data.dotacion_total,
                tipo_auditoria: data.tipo_auditoria || 'sistema',
                estado_auditoria: data.estado_auditoria,
                fecha_limite_subsanacion: data.fecha_limite_subsanacion,
                contratista_asignacion_id: data.contratista_asignacion_id, // existing assignment
                eecc_nombre: data.eecc_nombre || '',
                auditor_name: data.auditor?.name || ''
            });
            setRegistroCerrado(data.cerrado === 1 || data.cerrado === true);
            setReviewComments(data.comentario_general || '');

            // Fetch General Commitments
            try {
                const compRes = await api.get('/compromisos', { params: { registro_id: id } });
                setGeneralCommitments(compRes.data.data);
            } catch (e) {
                console.error("Error loading commitments", e);
            }

            // If Admin/ADC, set selected contractor so dropdown populates
            if (user?.role === 'admin' || user?.role === 'administrador_contrato') {
                const cId = data.vinculacionEntidad?.contratista_id || data.asignacion?.contratista_id;
                if (cId) setSelectedContractor(cId);
            }

            if (data.actividades) {
                setActividades(data.actividades.map(ra => ({
                    id: ra.id,
                    actividad_id: ra.actividad_id,
                    codigo: ra.actividad?.codigo,
                    descripcion: ra.actividad?.descripcion,
                    criterios: ra.actividad?.criterios,
                    frecuencia: ra.actividad?.frecuencia,
                    template_url: ra.actividad?.template_url, // Include template_url
                    elemento: ra.actividad?.elemento, // Include elemento
                    requiere_evidencia: ra.actividad?.requiere_evidencia === 1 || ra.actividad?.requiere_evidencia === true,
                    cumple: ra.cumple,
                    responsable: ra.responsable || '',
                    descripcion_contratista: ra.descripcion_contratista || '',
                    evidencias: ra.evidencias || [],
                    cumple_auditor: ra.cumple_auditor,
                    observacion_auditor: ra.observacion_auditor || '',
                    hallazgos: ra.hallazgos || []
                })));
            }
        } catch (err) {
            setError('Error al cargar registro');
        }
    };

    const handleActividadChange = (index, field, value) => {
        const updated = [...actividades];
        updated[index][field] = value;
        setActividades(updated);
    };

    const handleSubmit = async (e, options = {}) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        setError('');

        if (isEdit && (options.enviar || options.terminar_subsanacion)) {
            const missingEvidence = actividades.filter(a =>
                (a.cumple === 1 || a.cumple === true) &&
                a.requiere_evidencia &&
                (!a.evidencias || a.evidencias.length === 0) &&
                (!a.pendingFiles || a.pendingFiles.length === 0)
            );

            if (missingEvidence.length > 0) {
                const codigos = missingEvidence.map(a => a.codigo).join(', ');
                const context = options.terminar_subsanacion ? 'enviar la subsanación' : 'enviar el registro';
                setError(`⚠️ No se puede ${context}: Faltan evidencias obligatorias para las actividades [${codigos}]. Por favor, adjunte los documentos antes de continuar.`);
                setLoading(false);
                window.scrollTo(0, 0);
                return;
            }
        }

        // Validate assignment
        if (!form.contratista_asignacion_id) {
            setError('Debe seleccionar una asignación (contrato/servicio)');
            setLoading(false);
            return;
        }

        const payload = {
            ...form,
            terminar_subsanacion: options.terminar_subsanacion || false,
            cerrado: options.enviar ? 1 : 0,
            contratista_id: selectedContractor, // Send selected Contratista company ID
            periodo: `${form.periodo}-01`,
            actividades: actividades.map(a => ({
                id: a.id,
                actividad_id: a.actividad_id,
                cumple: a.cumple,
                responsable: a.responsable,
                descripcion_contratista: a.descripcion_contratista,
                cumple_auditor: a.cumple_auditor,
                observacion_auditor: a.observacion_auditor
            }))
        };

        try {
            let response;
            if (isEdit) {
                response = await api.put(`/registros/${id}`, payload);
            } else {
                response = await api.post('/registros', payload);
            }

            // Process Pending Uploads if any (for New Registers)
            if (!isEdit) {
                const hasFiles = actividades.some(a => a.pendingFiles?.length > 0);
                if (hasFiles) {
                    let createdReq = response.data.data;
                    const newRegId = createdReq.id;

                    // If activities not returned in response, fetch them to get IDs
                    if (!createdReq.actividades) {
                        const refetch = await api.get(`/registros/${newRegId}`);
                        createdReq = refetch.data.data;
                    }

                    // Upload files
                    await Promise.all(actividades.map(async (localAct) => {
                        if (localAct.pendingFiles?.length > 0) {
                            // Match local activity to new RegistroActividad by activity_id
                            const targetRA = createdReq.actividades.find(ra => ra.actividad_id === localAct.actividad_id);
                            if (targetRA) {
                                await Promise.all(localAct.pendingFiles.map(file => {
                                    const fd = new FormData();
                                    fd.append('archivo', file);
                                    fd.append('registro_actividad_id', targetRA.id);
                                    return api.post('/evidencias', fd, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                }));
                            }
                        }
                    }));
                }
            }

            navigate('/registros');
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al guardar';
            if (err.response?.status === 409) {
                setErrorModal({ show: true, message: msg });
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReabrirDirecto = () => {
        setReaperturaModal({ show: true, isDirect: true });
    };

    // Helper to get current assignment details
    const currentAssignment = useMemo(() => {
        if (!form.contratista_asignacion_id || !assignments.length) return null;
        return assignments.find(a => String(a.id) === String(form.contratista_asignacion_id));
    }, [form.contratista_asignacion_id, assignments]);

    // Group activities by Elemento
    const groupedActividades = useMemo(() => {
        const groups = {};
        actividades.forEach(act => {
            const elemId = act.elemento?.id || 'other';
            const elemName = act.elemento?.nombre || 'Otros';
            // Assuming Elemento has a number/prefix like "ELEMENTO 9: ..."
            // If not, we might want to pretend or just use the name
            if (!groups[elemId]) {
                groups[elemId] = { id: elemId, name: elemName, acts: [], total: 0, cumple: 0 };
            }
            groups[elemId].acts.push(act);

            // Calculate progress for element
            // Ignore N/A? Or strict? Let's use simple count for now.
            groups[elemId].total++;
            if (act.cumple) groups[elemId].cumple++;
        });
        return Object.values(groups).sort((a, b) => a.id - b.id);
    }, [actividades]);

    // Calculate total progress
    const totalProgress = useMemo(() => {
        if (!actividades.length) return 0;
        // Parse "cumple" as it can be boolean from UI or number from API
        // N/A (value 2) should be excluded from denominator if we want true compliance %
        const applicable = actividades.filter(a => a.cumple !== 2);
        const cumplidas = applicable.filter(a => a.cumple === true || a.cumple === 1).length;
        if (applicable.length === 0) return 0;
        return Math.round((cumplidas / applicable.length) * 100);
    }, [actividades]);

    const handleBack = () => navigate(-1);

    if (!user) return <div className="loading">Cargando...</div>;

    const parsedCursor = (disabled) => disabled ? 'not-allowed' : 'pointer';

    const readOnlyStyle = {
        backgroundColor: themeColors.inputBg,
        border: `1px solid ${themeColors.inputBorder}`,
        color: themeColors.inputText
    };

    const isCompletable = useMemo(() => {
        if (!actividades || actividades.length === 0) return false;
        // Verify all activities that are 'cumple' & 'requiere_evidencia' have files
        const missingEvidence = actividades.filter(a =>
            (a.cumple === true || a.cumple === 1) &&
            a.requiere_evidencia &&
            (!a.evidencias?.length && !a.pendingFiles?.length)
        );
        return missingEvidence.length === 0;
    }, [actividades]);

    const selectedAssignmentLabel = useMemo(() => {
        if (!form.contratista_asignacion_id || assignments.length === 0) return 'No seleccionado';
        const a = assignments.find(assign => String(assign.id) === String(form.contratista_asignacion_id));
        if (!a) return 'No seleccionado';
        return `${a.servicio?.programa?.nombre || ''} » ${a.servicio?.nombre || ''} » ${a.dependencia?.nombre || ''}`;
    }, [form.contratista_asignacion_id, assignments]);

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'cumplido': return <CheckCircle className="text-success" size={20} />;
            case 'vencido': return <AlertTriangle className="text-danger" size={20} />;
            case 'en_proceso': return <Clock className="text-info" size={20} />;
            default: return <Clock className="text-warning" size={20} />;
        }
    };

    const handleCumplirCompromiso = async (compId) => {
        const file = evidenceFiles[compId];
        const comment = evidenceComments[compId];

        setUploadingCompromisoId(compId);
        try {
            const formData = new FormData();
            if (file) {
                formData.append('evidencia', file);
            }
            if (comment) {
                formData.append('comentario_evidencia', comment);
            }

            await api.patch(`/compromisos/${compId}/cumplir`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Compromiso marcado como cumplido');
            
            // Reload commitments
            const compRes = await api.get('/compromisos', { params: { registro_id: id } });
            setGeneralCommitments(compRes.data.data);
            
            // Clear input states
            setEvidenceFiles(prev => {
                const updated = { ...prev };
                delete updated[compId];
                return updated;
            });
            setEvidenceComments(prev => {
                const updated = { ...prev };
                delete updated[compId];
                return updated;
            });
        } catch (err) {
            console.error('Error marking commitment as cumplido:', err);
            const errMsg = err.response?.data?.message || 'Error al guardar';
            toast.error(errMsg);
        } finally {
            setUploadingCompromisoId(null);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '16px', backgroundColor: themeColors.pageBg, minHeight: '100vh', transition: 'background-color 0.3s ease' }}>

            {/* Header Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: `1px solid ${themeColors.border}`, paddingBottom: '1rem' }}>
                <FileText size={24} color={themeColors.headerBg} />
                <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: themeColors.textPrimary, margin: 0 }}>
                    Registro Mensual de Cumplimiento {isReadOnly && <span style={{ fontSize: '0.8rem', backgroundColor: themeColors.inputBg, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${themeColors.inputBorder}`, color: themeColors.textSecondary, marginLeft: '10px' }}>VISTA SOLO LECTURA</span>}
                </h1>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>

                {/* Information Card */}
                <div style={{ backgroundColor: themeColors.cardBg, borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem', transition: 'background-color 0.3s ease' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: themeColors.textPrimary, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '4px', height: '16px', backgroundColor: themeColors.headerBg, borderRadius: '2px' }}></span>
                        Información del Contratista
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Visualización de Asignación / Vinculación (Solo Lectura) */}
                        <div style={{ gridColumn: 'span 3' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Asignación Vinculada (Servicio & Dependencia)</label>
                            <div style={{
                                ...readOnlyStyle,
                                padding: '0.6rem 1rem',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                minHeight: '36px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0'
                            }}>
                                <ClipboardCheck size={18} color={themeColors.headerBg} />
                                {selectedAssignmentLabel}
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Periodo *</label>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {/* Access Text representation of month if needed, or just the input */}
                                <input
                                    type="text"
                                    className="form-control"
                                    style={readOnlyStyle} 
                                    disabled={true}
                                    value={form.periodo ? (() => {
                                        const [y, m] = form.periodo.split('-');
                                        return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                                    })() : ''}
                                    readOnly={true} 
                                />
                                {/* Hidden real input if needed or just use logic */}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Nombre EECC *</label>
                            <input type="text" className="form-control" style={readOnlyStyle} readOnly
                                value={form.eecc_nombre || user?.contratistaEntidad?.nombre || user?.eecc_nombre || searchNombre || ''} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Dotación Total</label>
                            <input id="form-dotacion-total" type="number" className="form-control"
                                value={form.dotacion_total}
                                disabled={isLocked}
                                onChange={(e) => setForm({ ...form, dotacion_total: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Row 3 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Personas Nuevas</label>
                            <input id="form-personas-nuevas" type="number" className="form-control"
                                value={form.personas_nuevas}
                                disabled={isLocked}
                                onChange={(e) => setForm({ ...form, personas_nuevas: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Supervisores</label>
                            <input type="number" className="form-control"
                                value={form.supervisores}
                                disabled={isLocked}
                                onChange={(e) => setForm({ ...form, supervisores: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Prevencionistas</label>
                            <input type="number" className="form-control"
                                value={form.prevencionistas}
                                disabled={isLocked}
                                onChange={(e) => setForm({ ...form, prevencionistas: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Row 4: Auditor Options & Deadlines */}
                        <div style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: `1px solid ${themeColors.border}` }}>
                            {isAdminOrADC && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Tipo de Auditoría</label>
                                    <select
                                        className="form-control"
                                        value={form.tipo_auditoria || 'sistema'}
                                        onChange={(e) => setForm({ ...form, tipo_auditoria: e.target.value })}
                                        disabled={isLocked}
                                        style={{ ...isLocked ? readOnlyStyle : {}, padding: '0.5rem', fontSize: '0.9rem' }}
                                    >
                                        <option value="sistema">Sistémica</option>
                                        <option value="terreno">De Terreno</option>
                                    </select>
                                </div>
                            )}

                            {form.auditor_name && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: themeColors.textSecondary, marginBottom: '0.25rem' }}>Auditor Responsable</label>
                                    <div style={{ ...readOnlyStyle, padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 600 }}>
                                        {form.auditor_name}
                                    </div>
                                </div>
                            )}
                            
                            {form.fecha_limite_subsanacion && (
                                <div style={{ gridColumn: isAdminOrADC ? 'span 2' : 'span 3' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem' }}>⚠️ Fecha Límite de Subsanación</label>
                                    <div style={{ 
                                        padding: '0.6rem 1rem', 
                                        borderRadius: '6px', 
                                        backgroundColor: '#fef2f2', 
                                        border: '1px solid #fecaca', 
                                        color: '#b91c1c',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <Clock size={18} />
                                        El plazo para corregir este registro vence el: {new Date(form.fecha_limite_subsanacion).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{ backgroundColor: themeColors.cardBg, borderRadius: '8px', padding: '0.75rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem', transition: 'background-color 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 600, color: themeColors.textPrimary }}>Progreso de Cumplimiento</span>
                        <span style={{ fontWeight: 700, color: totalProgress < 70 ? '#ef4444' : '#10b981' }}>{totalProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: themeColors.progressTrackBg, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${totalProgress}%`, height: '100%', backgroundColor: totalProgress < 70 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginTop: '0.5rem' }}>Meta: 85%</div>
                </div>

                {/* Findings Summary Section */}
                {allHallazgos.length > 0 && (
                    <div style={{ 
                        backgroundColor: themeColors.cardBg, 
                        borderRadius: '8px', 
                        padding: '1.25rem', 
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
                        marginBottom: '1.5rem', 
                        border: '1px solid #fecaca',
                        borderLeft: '5px solid #ef4444'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                            <AlertTriangle color="#ef4444" size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#991b1b' }}>Hallazgos Detectados ({allHallazgos.length})</h3>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            {allHallazgos.map((h, idx) => (
                                <div 
                                    key={h.id || idx} 
                                    id={`finding-${h.id}`}
                                    style={{ 
                                        padding: '1rem', 
                                        backgroundColor: '#fffafb', 
                                        borderRadius: '6px', 
                                        border: '1px solid #fee2e2',
                                        transition: 'all 0.5s ease'
                                    }}
                                >
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#dc2626', marginBottom: '0.5rem' }}>
                                            {h.actividad_codigo && `[${h.actividad_codigo}] `}{h.actividad_nombre}
                                        </div>
                                        <div>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 800, 
                                                textTransform: 'uppercase',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: h.tipo === 'no_conformidad' ? '#fee2e2' : '#fef9c3',
                                                color: h.tipo === 'no_conformidad' ? '#991b1b' : '#854d0e',
                                                display: 'inline-block'
                                            }}>
                                                {h.tipo?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.4' }}>
                                        {h.descripcion}
                                    </div>
                                    {h.fecha_limite && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                                            Plazo: {new Date(h.fecha_limite).toLocaleDateString('es-CL')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Activities Groups */}
                {groupedActividades.map(group => (
                    <div key={group.id} style={{ marginBottom: '2rem', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', backgroundColor: themeColors.cardBg, transition: 'background-color 0.3s ease' }}>
                        {/* Element Header */}
                        <div style={{ backgroundColor: themeColors.headerBg, color: themeColors.textOnHeader, padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background-color 0.3s ease' }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: themeColors.textOnHeader }}>
                                {group.name}
                            </h3>
                            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                {group.cumple}/{group.total}  {Math.round((group.cumple / group.total) * 100)}%
                            </div>
                        </div>

                        {/* Activities Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ backgroundColor: themeColors.tableHeadBg, color: themeColors.tableHeadColor, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '60px' }}>N°</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '30%' }}>Actividad</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '15%' }}>Criterios de Aceptar</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, width: '80px' }}>Frecuencia</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, width: '140px' }}>Cumple</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, width: '100px', backgroundColor: '#f0f9ff', color: '#0369a1' }}>Auditor</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '150px', backgroundColor: '#f0f9ff', color: '#0369a1' }}>Obs. Auditor</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '150px' }}>Responsable</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '180px' }}>Obs. Contratista</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, width: '150px' }}>Evidencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.acts.map((act) => {
                                        // Find index in main activities array for handlers
                                        const globalIndex = actividades.findIndex(a => a === act);

                                        return (
                                            <tr key={act.id || act.actividad_id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                                                <td style={{ padding: '1rem', verticalAlign: 'top', color: themeColors.headerBg, fontWeight: 600 }}>
                                                    <span style={{ backgroundColor: themeColors.accentLight, padding: '2px 6px', borderRadius: '4px' }}>{act.codigo}</span>
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top', color: themeColors.textPrimary }}>
                                                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{act.descripcion}</div>
                                                    {act.requiere_evidencia && (
                                                        <span style={{ 
                                                            fontSize: '0.65rem', 
                                                            backgroundColor: '#fee2e2', 
                                                            color: '#dc2626', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '10px', 
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}>
                                                            <FileText size={10} /> EVIDENCIA OBLIGATORIA
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top', color: themeColors.textSecondary, fontSize: '0.8rem' }}>
                                                    {act.criterios || '-'}
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'center', color: themeColors.textSecondary, fontSize: '0.8rem' }}>
                                                    {act.frecuencia || 'Mensual'}
                                                </td>
                                                <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (isLocked) return;
                                                                if (act.requiere_evidencia && (!act.evidencias?.length && !act.pendingFiles?.length)) {
                                                                    toast.error('Esta actividad requiere evidencia obligatoria. Por favor, cárguela antes de marcar como "Cumple".');
                                                                    return;
                                                                }
                                                                handleActividadChange(globalIndex, 'cumple', true);
                                                            }}
                                                            style={{
                                                                padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid', cursor: parsedCursor(isLocked),
                                                                backgroundColor: act.cumple ? '#f0fdf4' : 'transparent',
                                                                borderColor: act.cumple ? '#16a34a' : '#e5e7eb',
                                                                color: act.cumple ? '#15803d' : '#9ca3af',
                                                                fontWeight: act.cumple ? 600 : 400,
                                                                opacity: isLocked ? 0.6 : 1
                                                            }}
                                                        >
                                                            ✓ Cumple
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => !isLocked && handleActividadChange(globalIndex, 'cumple', false)}
                                                            style={{
                                                                padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid', cursor: parsedCursor(isLocked),
                                                                backgroundColor: !act.cumple ? '#fef2f2' : 'transparent',
                                                                borderColor: !act.cumple ? '#ef4444' : '#e5e7eb',
                                                                color: !act.cumple ? '#b91c1c' : '#9ca3af',
                                                                fontWeight: !act.cumple ? 600 : 400,
                                                                opacity: isLocked ? 0.6 : 1,
                                                                width: '100%',
                                                                minWidth: '95px'
                                                            }}
                                                        >
                                                            ✕ No Cumple
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* Auditor Columns */}
                                                <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                        <div>
                                                            {(act.cumple_auditor === true || act.cumple_auditor === 1) && <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>}
                                                            {(act.cumple_auditor === false || act.cumple_auditor === 0) && <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.2rem' }}>✕</span>}
                                                            {(act.cumple_auditor === null || act.cumple_auditor === undefined) && <span style={{ color: '#9ca3af' }}>-</span>}
                                                        </div>
                                                        {act.hallazgos && act.hallazgos.length > 0 && (
                                                            <div 
                                                                onClick={() => scrollToFinding(act.hallazgos[0].id)}
                                                                style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '3px', 
                                                                    backgroundColor: '#fef2f2', 
                                                                    color: '#dc2626', 
                                                                    padding: '2px 6px', 
                                                                    borderRadius: '10px', 
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 700,
                                                                    border: '1px solid #fee2e2',
                                                                    cursor: 'pointer',
                                                                    transition: 'transform 0.2s'
                                                                }} 
                                                                className="hover-scale"
                                                                title="Clic para ver detalle del hallazgo"
                                                            >
                                                                <AlertTriangle size={10} /> HALLAZGO
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top', backgroundColor: '#f0f9ff', fontSize: '0.8rem', color: '#374151' }}>
                                                    {act.observacion_auditor || '-'}
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Nombre"
                                                        value={act.responsable}
                                                        onChange={(e) => handleActividadChange(globalIndex, 'responsable', e.target.value)}
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem', height: 'auto' }}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                                    <textarea
                                                        className="form-control"
                                                        placeholder="Comentarios o justificaciones..."
                                                        value={act.descripcion_contratista}
                                                        onChange={(e) => handleActividadChange(globalIndex, 'descripcion_contratista', e.target.value)}
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem', minHeight: '60px', resize: 'vertical' }}
                                                        disabled={isLocked}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                                    {/* Use FileUpload component but style it */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {isEdit ? (
                                                            <div className="custom-file-upload">
                                                                <FileUpload
                                                                    registroActividadId={act.id}
                                                                    existingCount={act.evidencias?.length || 0}
                                                                    templateUrl={act.template_url}
                                                                    disabled={isLocked}
                                                                    onUploadComplete={(evidencia) => {
                                                                        setActividades(prev => prev.map((a, i) => {
                                                                            if (i === globalIndex) {
                                                                                const newEvidencias = [...(a.evidencias || []), evidencia];
                                                                                return { 
                                                                                    ...a, 
                                                                                    evidencias: newEvidencias,
                                                                                    cumple: a.requiere_evidencia ? true : a.cumple
                                                                                };
                                                                            }
                                                                            return a;
                                                                        }));
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="custom-file-upload">
                                                                <FileUpload
                                                                    existingCount={(act.pendingFiles?.length || 0)}
                                                                    templateUrl={act.template_url}
                                                                    disabled={isLocked}
                                                                    onFileSelect={(file) => {
                                                                        setActividades(prev => prev.map((a, i) => {
                                                                            if (i === globalIndex) {
                                                                                const newPending = [...(a.pendingFiles || []), file];
                                                                                return { 
                                                                                    ...a, 
                                                                                    pendingFiles: newPending,
                                                                                    cumple: a.requiere_evidencia ? true : a.cumple
                                                                                };
                                                                            }
                                                                            return a;
                                                                        }));
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                                             {/* Existing Evidence */}
                                                        {act.evidencias?.length > 0 && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {act.evidencias.map(e => (
                                                                    <div key={e.id} style={{ border: '1px solid #e5e7eb', padding: '8px', borderRadius: '6px', background: '#f8fafc' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'space-between' }}>
                                                                            <a
                                                                                href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${e.ruta}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{ fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}
                                                                                title={e.nombre_archivo}
                                                                            >
                                                                                📄 {e.nombre_archivo.length > 20 ? e.nombre_archivo.substring(0, 20) + '...' : e.nombre_archivo}
                                                                            </a>
                                                                            {!isLocked && !(isContractor && form.estado_auditoria === 'pendiente_subsanacion') && (
                                                                                <button
                                                                                    type="button"
                                                                                    title="Eliminar evidencia"
                                                                                    onClick={() => handleEvidenciaDelete(e.id, globalIndex)}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        cursor: 'pointer',
                                                                                        padding: '2px',
                                                                                        color: '#ef4444',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        flexShrink: 0,
                                                                                        borderRadius: '3px'
                                                                                    }}
                                                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Subsanation uploader for this specific evidence */}
                                                                        {isContractor && form.estado_auditoria === 'pendiente_subsanacion' && (
                                                                            <div style={{ marginTop: '8px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
                                                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                                                                                    Cargar Subsanación:
                                                                                </div>
                                                                                <FileUpload
                                                                                    registroActividadId={act.id}
                                                                                    existingCount={0}
                                                                                    maxFiles={1}
                                                                                    disabled={isLocked}
                                                                                    descripcion={`subsanacion_original_${e.id}`}
                                                                                    onUploadComplete={(newEv) => {
                                                                                        toast.success('Evidencia de subsanación cargada');
                                                                                        setActividades(prev => prev.map((a, i) => {
                                                                                            if (i === globalIndex) {
                                                                                                const newEvidencias = [...(a.evidencias || []), newEv];
                                                                                                return { ...a, evidencias: newEvidencias };
                                                                                            }
                                                                                            return a;
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Pending Files */}
                                                        {act.pendingFiles?.length > 0 && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                                                <small style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Pendientes:</small>
                                                                {act.pendingFiles.map((f, i) => (
                                                                    <div key={i} style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>⏳ {f.name}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handlePendingFileDelete(globalIndex, i)}
                                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px' }}
                                                                        >
                                                                            <Trash2 size={10} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
                }

                {/* Audit Feedback Section */}
                {(isEdit && (reviewComments || generalCommitments.length > 0)) && (
                    <div style={{ marginTop: '2rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                        {/* Comments */}
                        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={18} /> Comentarios Auditoría
                            </h3>
                            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem', color: '#4b5563', minHeight: '80px' }}>
                                {reviewComments || 'Sin comentarios generales.'}
                            </div>
                        </div>

                        {/* Commitments */}
                        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ClipboardCheck size={18} /> Compromisos Pendientes
                            </h3>
                            {generalCommitments.filter(c => c.estado !== 'cumplido').length === 0 ? (
                                <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay compromisos pendientes por cumplir.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {generalCommitments.filter(c => c.estado !== 'cumplido').map(comp => {
                                        const isVencidoComp = new Date(comp.fecha_compromiso) < new Date();
                                        const compStatus = isVencidoComp ? 'vencido' : comp.estado;
                                        
                                        const statusColors = {
                                            pendiente: { bg: '#fffbeb', border: '#fef3c7', text: '#b45309', bar: '#f59e0b' },
                                            en_proceso: { bg: '#eff6ff', border: '#dbeafe', text: '#1d4ed8', bar: '#3b82f6' },
                                            cumplido: { bg: '#f0fdf4', border: '#dcfce7', text: '#15803d', bar: '#10b981' },
                                            vencido: { bg: '#fef2f2', border: '#fee2e2', text: '#b91c1c', bar: '#ef4444' }
                                        };

                                        const color = statusColors[compStatus] || statusColors.pendiente;

                                        return (
                                            <div 
                                                key={comp.id} 
                                                className="compromiso-card" 
                                                style={{ 
                                                    borderLeft: `5px solid ${color.bar}`,
                                                    borderTop: '1px solid #e2e8f0',
                                                    borderRight: '1px solid #e2e8f0',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    backgroundColor: '#fff',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px'
                                                }}
                                            >
                                                <div className="compromiso-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div className="status-badge" style={{ background: color.bg, color: color.text, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                                                        {getEstadoIcon(compStatus)}
                                                        {compStatus.replace('_', ' ')}
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <p className="card-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{comp.descripcion}</p>
                                                </div>

                                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                                            <Clock size={14} />
                                                            <span>Vencimiento:</span>
                                                        </div>
                                                        <span style={{ fontWeight: 700, color: compStatus === 'vencido' ? '#ef4444' : '#1e293b' }}>
                                                            {new Date(comp.fecha_compromiso).toLocaleDateString('es-CL')}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                                            <User size={14} />
                                                            <span>Responsable:</span>
                                                        </div>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                            {comp.responsable?.name || 'Sin asignar'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Contractor evidence & comment form */}
                                                {(isAdminOrADC || isContractor) && (
                                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Cargar Evidencia de Cumplimiento:</div>
                                                        <input 
                                                            type="file" 
                                                            id={`evidence-file-${comp.id}`}
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setEvidenceFiles(prev => ({ ...prev, [comp.id]: e.target.files[0] }));
                                                                }
                                                            }}
                                                            style={{ fontSize: '0.75rem', color: '#64748b' }}
                                                        />
                                                        <textarea
                                                            placeholder="Comentario sobre la evidencia..."
                                                            value={evidenceComments[comp.id] || ''}
                                                            onChange={(e) => setEvidenceComments(prev => ({ ...prev, [comp.id]: e.target.value }))}
                                                            style={{ fontSize: '0.75rem', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '40px', fontFamily: 'inherit' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn-primary"
                                                            disabled={uploadingCompromisoId === comp.id}
                                                            onClick={() => handleCumplirCompromiso(comp.id)}
                                                            style={{
                                                                marginTop: '4px',
                                                                background: user?.role === 'contratista_user' ? '#2563eb' : '#10b981',
                                                                borderColor: user?.role === 'contratista_user' ? '#2563eb' : '#10b981',
                                                                boxShadow: user?.role === 'contratista_user' ? '0 4px 6px -1px rgba(37, 99, 235, 0.2)' : '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                                                                fontSize: '0.8rem',
                                                                padding: '6px 12px',
                                                                cursor: 'pointer',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                color: '#fff',
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            {uploadingCompromisoId === comp.id ? 'Subiendo...' : (user?.role === 'contratista_user' ? 'CARGAR EVIDENCIA' : 'Marcar Cumplido')}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Admin Evidence View & Download Icon */}
                                                {comp.ruta_evidencia && (
                                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span>Evidencia Cargada:</span>
                                                            <a 
                                                                href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${comp.ruta_evidencia}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 700 }}
                                                                title="Ver/Descargar Evidencia"
                                                            >
                                                                <Download size={14} /> Ver Archivo
                                                            </a>
                                                        </div>
                                                        {comp.comentario_evidencia && (
                                                            <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', borderLeft: '3px solid #cbd5e1', marginTop: '2px' }}>
                                                                "{comp.comentario_evidencia}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: themeColors.footerBg,
                    padding: '1rem 1rem',
                    borderTop: `1px solid ${themeColors.border}`,
                    zIndex: 10,
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                    marginLeft: '-20px',
                    marginRight: '-20px',
                    transition: 'background-color 0.3s ease'
                }}>
                    <button
                        type="button"
                        onClick={handleBack}
                        style={{ background: 'none', border: 'none', color: themeColors.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        ← Volver
                    </button>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Reabrir Action for Admin/ADC */}
                        {(isAdminOrADC && (registroCerrado || ['auditado', 'auditada'].includes(form.estado_auditoria))) && (
                            <button
                                type="button"
                                onClick={handleReabrirDirecto}
                                style={{
                                    backgroundColor: '#f59e0b', color: 'white', padding: '0.75rem 2rem', borderRadius: '6px',
                                    border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <RefreshCw size={20} /> Reabrir Registro
                            </button>
                        )}

                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => window.open(`${api.defaults.baseURL}/reportes/registro/${id}/pdf?token=${localStorage.getItem('token')}`, '_blank')}
                                style={{
                                    backgroundColor: '#f8fafc', color: '#475569', padding: '0.75rem 1.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}
                            >
                                <FileText size={18} /> Ver Reporte PDF
                            </button>
                        )}

                        {!isLocked && (
                            <>
                                {isContractor && (form.estado_auditoria === 'reabierto' || form.estado_auditoria === 'pendiente_subsanacion') && (
                                    <button
                                        id="btn-end-subsanacion"
                                        type="button"
                                        onClick={(e) => handleSubmit(e, { terminar_subsanacion: true })}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 2rem', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        <CheckCircle size={20} /> Terminar Subsanación
                                    </button>
                                )}
                                <button
                                    id="btn-save-draft"
                                    type="button"
                                    onClick={(e) => handleSubmit(e, { enviar: false })}
                                    disabled={loading}
                                    style={{
                                        backgroundColor: '#f3f4f6', color: '#374151', padding: '0.75rem 1.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}
                                >
                                    {loading ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                                    Guardar Borrador
                                </button>
                                {form.estado_auditoria === 'pendiente' && (
                                    <button
                                        id="btn-send-review"
                                        type="button"
                                        onClick={(e) => handleSubmit(e, { enviar: true })}
                                        disabled={loading || !isCompletable}
                                        title={!isCompletable ? "Faltan evidencias en actividades obligatorias" : "Enviar registro para Auditoría"}
                                        style={{
                                            backgroundColor: isCompletable ? '#10b981' : '#d1d5db', 
                                            color: isCompletable ? 'white' : '#6b7280', 
                                            padding: '0.75rem 2rem', borderRadius: '6px', border: 'none', fontWeight: 600, 
                                            cursor: isCompletable ? 'pointer' : 'not-allowed',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            transition: 'background-color 0.3s'
                                        }}
                                    >
                                        <ClipboardCheck size={20} />
                                        Enviar a Revisión
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </form >

            {/* Modals placed outside */}
            {
                hallazgoModal.show && (
                    <HallazgoModal
                        show={hallazgoModal.show}
                        onClose={() => setHallazgoModal({ show: false, actividad: null, hallazgo: null })}
                        actividad={hallazgoModal.actividad}
                        hallazgo={hallazgoModal.hallazgo}
                        registroId={id || null}
                        onSuccess={hallazgoModal.hallazgo ? handleHallazgoSuccess : handleHallazgoSuccess}
                    />
                )
            }
            <CompromisoModal
                show={compromisoModal.show}
                onClose={() => setCompromisoModal({ show: false, hallazgo: null })}
                hallazgo={compromisoModal.hallazgo}
                onSuccess={handleCompromisoSuccess}
            />
            <SolicitudReaperturaModal
                isOpen={reaperturaModal.show}
                isDirect={reaperturaModal.isDirect}
                onClose={() => setReaperturaModal({ show: false })}
                registroId={id}
                onSuccess={() => { setReaperturaModal({ show: false }); fetchRegistro(); }}
            />
            {
                errorModal.show && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', textAlign: 'center' }}>
                            <h3 style={{ marginTop: 0, color: '#dc2626' }}>Error</h3>
                            <p>{errorModal.message}</p>
                            <button
                                onClick={() => setErrorModal({ show: false, message: '' })}
                                style={{
                                    marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer'
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )
            }

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div >
    );
};



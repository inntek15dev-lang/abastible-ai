import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import Modal from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { 
    RefreshCw, CheckCircle, AlertCircle, Info, Database, Layers, 
    Check, Loader2, ChevronLeft, ChevronRight, X, Sparkles, Server,
    Search
} from 'lucide-react';

const SyncContratistasModal = ({ isOpen, onClose, onSyncComplete }) => {
    const [step, setStep] = useState(0); // 0: Gerencias, 1: Subgerencias, 2: Servicios, 3: Dependencias, etc.
    const [loading, setLoading] = useState(false);
    const [diffData, setDiffData] = useState(null);
    const [syncing, setSyncing] = useState(false);
    
    // Single-item sync loader tracking map: { [itemKey]: boolean }
    const [syncingItems, setSyncingItems] = useState({});

    // Full Sync flow state
    const [fullSyncing, setFullSyncing] = useState(false);
    const [fullSyncProgress, setFullSyncProgress] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Search and Autocomplete State
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchComparison();
        } else {
            setStep(0);
            setDiffData(null);
            setCurrentPage(1);
            setSyncingItems({});
            setFullSyncing(false);
        }
    }, [isOpen]);

    // Reset pagination and search when step changes or data loads
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm('');
        setShowSuggestions(false);
    }, [step, diffData]);

    const fetchComparison = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sync/compare');
            setDiffData(response.data);
        } catch (error) {
            console.error('Error fetching sync data:', error);
            toast.error('Error al obtener datos para sincronización');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { label: 'Gerencias', key: 'gerencias', title: 'Paso 1: Sincronizar Gerencias' },
        { label: 'Subgerencias', key: 'subgerencias', title: 'Paso 2: Sincronizar Subgerencias' },
        { label: 'Servicios', key: 'servicios', title: 'Paso 3: Sincronizar Servicios' },
        { label: 'Dependencias', key: 'dependencias', title: 'Paso 4: Sincronizar Dependencias' },
        { label: 'Contratistas', key: 'contratistas', title: 'Paso 5: Sincronizar Contratistas' },
        { label: 'Contratista Admin', key: 'contratista_admin', title: 'Paso 6: Sincronizar Admins de Contratistas' },
        { label: 'Vinculaciones', key: 'vinculaciones', title: 'Paso 7: Sincronizar Vinculaciones' },
        { label: 'Admin Contratos', key: 'administrador_contrato', title: 'Paso 8: Sincronizar Admins de Contratos' }
    ];

    const currentKey = steps[step]?.key;
    const currentItems = diffData ? diffData[currentKey] : [];
    const newItems = currentItems.filter(i => i.estado === 'new' || i.estado === 'updated');
    const existingItems = currentItems.filter(i => i.estado === 'exists');

    // Filter items based on active entity fields and search term
    const filteredItems = useMemo(() => {
        if (!searchTerm) return currentItems;
        const term = searchTerm.toLowerCase();
        return currentItems.filter(item => {
            if (!item) return false;
            switch (currentKey) {
                case 'gerencias':
                case 'dependencias':
                    return item.nombre?.toLowerCase().includes(term);
                case 'subgerencias':
                    return (
                        item.nombre?.toLowerCase().includes(term) ||
                        item.gerencia?.toLowerCase().includes(term)
                    );
                case 'servicios':
                    return (
                        item.nombre?.toLowerCase().includes(term) ||
                        item.subgerencia?.toLowerCase().includes(term)
                    );
                case 'contratistas':
                    return (
                        item.nombre?.toLowerCase().includes(term) ||
                        item.rut?.toLowerCase().includes(term)
                    );
                case 'contratista_admin':
                case 'administrador_contrato':
                    return (
                        item.nombre?.toLowerCase().includes(term) ||
                        item.email?.toLowerCase().includes(term)
                    );
                case 'vinculaciones':
                    return (
                        item.contratista?.toLowerCase().includes(term) ||
                        item.rut_contratista?.toLowerCase().includes(term) ||
                        item.servicio?.toLowerCase().includes(term) ||
                        item.dependencia?.toLowerCase().includes(term) ||
                        item.subgerencia?.toLowerCase().includes(term) ||
                        item.gerencia?.toLowerCase().includes(term) ||
                        item.numero_contrato?.toLowerCase().includes(term)
                    );
                default:
                    return JSON.stringify(item).toLowerCase().includes(term);
            }
        });
    }, [currentItems, searchTerm, currentKey]);

    // Extract unique autocomplete suggestions matching current search term
    const suggestions = useMemo(() => {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        const results = new Set();
        
        for (const item of currentItems) {
            if (!item) continue;
            
            const candidates = [];
            if (currentKey === 'gerencias' || currentKey === 'dependencias') {
                if (item.nombre) candidates.push(item.nombre);
            } else if (currentKey === 'subgerencias') {
                if (item.nombre) candidates.push(item.nombre);
                if (item.gerencia) candidates.push(item.gerencia);
            } else if (currentKey === 'servicios') {
                if (item.nombre) candidates.push(item.nombre);
                if (item.subgerencia) candidates.push(item.subgerencia);
            } else if (currentKey === 'contratistas') {
                if (item.nombre) candidates.push(item.nombre);
                if (item.rut) candidates.push(item.rut);
            } else if (currentKey === 'contratista_admin' || currentKey === 'administrador_contrato') {
                if (item.nombre) candidates.push(item.nombre);
                if (item.email) candidates.push(item.email);
            } else if (currentKey === 'vinculaciones') {
                if (item.contratista) candidates.push(item.contratista);
                if (item.rut_contratista) candidates.push(item.rut_contratista);
                if (item.servicio) candidates.push(item.servicio);
                if (item.dependencia) candidates.push(item.dependencia);
                if (item.numero_contrato) candidates.push(item.numero_contrato);
            }
            
            for (const cand of candidates) {
                if (cand.toLowerCase().includes(term) && cand.toLowerCase() !== term) {
                    results.add(cand);
                    if (results.size >= 6) break;
                }
            }
            if (results.size >= 6) break;
        }
        
        return Array.from(results);
    }, [currentItems, searchTerm, currentKey]);

    // Pagination Logic based on filtered items
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Helpers
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-CL', { timeZone: 'UTC' });
    };

    const getItemKey = (item, type) => {
        switch (type) {
            case 'gerencias': return item.nombre;
            case 'subgerencias': return `${item.gerencia}|${item.nombre}`;
            case 'servicios': return `${item.subgerencia}|${item.nombre}`;
            case 'dependencias': return item.nombre;
            case 'contratistas': return item.rut;
            case 'contratista_admin': return item.email;
            case 'vinculaciones': return `${item.rut_contratista}|${item.servicio}|${item.dependencia}|${item.subgerencia}|${item.gerencia}`;
            case 'administrador_contrato': return item.email;
            default: return JSON.stringify(item);
        }
    };

    // Single item synchronization
    const handleSingleSync = async (item, type) => {
        const itemKey = getItemKey(item, type);
        setSyncingItems(prev => ({ ...prev, [itemKey]: true }));
        try {
            await api.post('/sync/execute', { type, items: [item] });
            toast.success('Elemento sincronizado correctamente');
            
            // Update local state directly so it reflects exists immediately
            setDiffData(prev => {
                if (!prev) return prev;
                const updatedList = prev[type].map(i => {
                    if (getItemKey(i, type) === itemKey) {
                        return { ...i, estado: 'exists' };
                    }
                    return i;
                });
                return { ...prev, [type]: updatedList };
            });
        } catch (error) {
            console.error('Error syncing individual item:', error);
            toast.error('Error al sincronizar el elemento');
        } finally {
            setSyncingItems(prev => {
                const copy = { ...prev };
                delete copy[itemKey];
                return copy;
            });
        }
    };

    // Entity-level synchronization
    const handleSync = async (type, items) => {
        setSyncing(true);
        try {
            await api.post('/sync/execute', { type, items });
            toast.success(`${type.toUpperCase()} sincronizados correctamente`);
            await fetchComparison();
        } catch (error) {
            console.error('Error syncing:', error);
            toast.error('Error al sincronizar datos');
        } finally {
            setSyncing(false);
        }
    };

    // Sequential Full Sync Flow
    const handleFullSync = async () => {
        setFullSyncing(true);
        
        // Initialize progress tracker for the 8 steps
        const initialProgress = steps.map(s => {
            const list = diffData ? diffData[s.key] : [];
            const toSync = list.filter(i => i.estado === 'new' || i.estado === 'updated');
            return {
                label: s.label,
                key: s.key,
                status: toSync.length > 0 ? 'pending' : 'completed',
                total: toSync.length,
                synced: 0
            };
        });
        setFullSyncProgress(initialProgress);

        try {
            for (let i = 0; i < steps.length; i++) {
                const currentStep = steps[i];
                const list = diffData ? diffData[currentStep.key] : [];
                const toSync = list.filter(item => item.estado === 'new' || item.estado === 'updated');

                if (toSync.length > 0) {
                    // Set status to syncing
                    setFullSyncProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'syncing' } : p));
                    
                    // Trigger sync endpoint for this entity's batch
                    await api.post('/sync/execute', { type: currentStep.key, items: toSync });
                    
                    // Mark as completed
                    setFullSyncProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'completed', synced: toSync.length } : p));
                } else {
                    // Nothing to sync, mark completed immediately
                    setFullSyncProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'completed', synced: 0 } : p));
                }
            }
            toast.success('Sincronización de lote completo exitosa');
            await fetchComparison();
        } catch (error) {
            console.error('Error in sequential Full Sync:', error);
            toast.error('La sincronización completa falló en un paso intermedio.');
            setFullSyncProgress(prev => prev.map(p => p.status === 'syncing' ? { ...p, status: 'error' } : p));
        }
    };

    // Helper for rendering relationship path tooltip content
    const getRelationalTree = (item, type) => {
        switch (type) {
            case 'gerencias':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Abastible</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">Gerencia: {item.nombre}</span>
                    </div>
                );
            case 'subgerencias':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Abastible</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">{item.gerencia}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">Subgerencia: {item.nombre}</span>
                    </div>
                );
            case 'servicios':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Abastible</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">{item.subgerencia}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">Servicio: {item.nombre}</span>
                    </div>
                );
            case 'dependencias':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Abastible</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">Dependencia: {item.nombre}</span>
                    </div>
                );
            case 'contratistas':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Contratistas</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">{item.nombre} (RUT: {item.rut})</span>
                    </div>
                );
            case 'contratista_admin':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Contratistas</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">RUTs: {item.rut_contratistas ? item.rut_contratistas.join(', ') : item.rut_contratista}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">Admin Contratista: {item.nombre} ({item.email})</span>
                    </div>
                );
            case 'vinculaciones':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Abastible</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">G: {item.gerencia}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">SG: {item.subgerencia}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">S: {item.servicio}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node">D: {item.dependencia}</span>
                        <span className="tooltip-arrow">➔</span>
                        <span className="tooltip-node active">Contratista: {item.contratista} ({item.rut_contratista})</span>
                    </div>
                );
            case 'administrador_contrato':
                return (
                    <div className="tooltip-tree">
                        <span className="tooltip-node root">Admin Contrato: {item.nombre} ({item.email})</span>
                        {item.asignaciones && item.asignaciones.length > 0 ? (
                            <div className="tooltip-sublist">
                                <div className="tooltip-sublist-title">Asignaciones ({item.asignaciones.length}):</div>
                                {item.asignaciones.slice(0, 3).map((a, idx) => (
                                    <div key={idx} className="tooltip-subitem">
                                        • {a.gerencia} ➔ {a.subgerencia} ➔ {a.servicio} ➔ {a.dependencia} ➔ RUT: {a.rut_contratista}
                                    </div>
                                ))}
                                {item.asignaciones.length > 3 && (
                                    <div className="tooltip-subitem italic">...y {item.asignaciones.length - 3} más</div>
                                )}
                            </div>
                        ) : (
                            <div className="tooltip-sublist-title italic text-gray-400">Sin asignaciones vinculadas</div>
                        )}
                    </div>
                );
            default:
                return <div>{JSON.stringify(item)}</div>;
        }
    };

    const renderTable = () => {
        if (!diffData) return <p className="text-gray-500 text-center py-8">Cargando datos...</p>;

        return (
            <div className="flex flex-col h-full">
                <style>{`
                    .sync-modal-header {
                        background-color: var(--color-brand-secondary) !important;
                        color: white !important;
                        padding: 16px 24px;
                        border-bottom: 3px solid var(--color-brand-primary);
                    }
                    .sync-modal-title {
                        color: white !important;
                        font-family: var(--font-family-heading) !important;
                        font-weight: 700;
                    }
                    .sync-stepper {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background-color: #f8fafc;
                        padding: 14px;
                        border-radius: var(--border-radius-md);
                        border: 1px solid var(--border-color);
                    }
                    .sync-step-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        cursor: pointer;
                        position: relative;
                        flex: 1;
                        transition: all 0.2s ease;
                    }
                    .sync-step-circle {
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background-color: white;
                        border: 2px solid #cbd5e1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 13px;
                        color: var(--color-text-secondary);
                        z-index: 1;
                        transition: all 0.2s ease;
                    }
                    .sync-step-item.active .sync-step-circle {
                        border-color: var(--color-brand-primary);
                        background-color: var(--color-brand-primary);
                        color: white;
                        box-shadow: 0 0 0 4px rgba(255, 102, 0, 0.15);
                    }
                    .sync-step-item.completed .sync-step-circle {
                        border-color: var(--color-brand-secondary);
                        background-color: var(--color-brand-secondary);
                        color: white;
                    }
                    .sync-step-label {
                        font-size: 11px;
                        font-weight: 600;
                        margin-top: 6px;
                        color: var(--color-text-secondary);
                        text-align: center;
                    }
                    .sync-step-item.active .sync-step-label {
                        color: var(--color-brand-primary);
                        font-weight: 700;
                    }
                    .sync-step-line {
                        position: absolute;
                        top: 16px;
                        left: calc(50% + 16px);
                        right: calc(-50% + 16px);
                        height: 2px;
                        background-color: #cbd5e1;
                        z-index: 0;
                    }
                    .sync-step-item.completed .sync-step-line {
                        background-color: var(--color-brand-secondary);
                    }
                    .sync-table-container {
                        border-radius: var(--border-radius-md);
                        border: 1px solid var(--border-color);
                        overflow: hidden;
                        box-shadow: var(--shadow-sm);
                    }
                    .sync-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: var(--font-size-sm);
                    }
                    .sync-table th {
                        background-color: #f8fafc;
                        color: var(--color-brand-secondary);
                        font-family: var(--font-family-heading);
                        font-weight: 700;
                        text-transform: uppercase;
                        font-size: 11px;
                        letter-spacing: 0.05em;
                        padding: 12px 16px;
                        border-bottom: 2px solid var(--border-color);
                    }
                    .sync-table td {
                        padding: 12px 16px;
                        border-bottom: 1px solid var(--border-color);
                        vertical-align: middle;
                    }
                    .sync-table tr:hover {
                        background-color: var(--color-bg-hover) !important;
                    }
                    .relational-cell {
                        position: relative;
                        cursor: help;
                    }
                    .relational-tooltip {
                        position: absolute;
                        left: 20%;
                        bottom: 110%;
                        background-color: var(--color-brand-secondary);
                        color: white;
                        border-left: 4px solid var(--color-brand-primary);
                        padding: 12px;
                        border-radius: 8px;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                        z-index: 50;
                        width: 320px;
                        pointer-events: none;
                        font-size: 12px;
                        line-height: 1.5;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.25s ease, transform 0.25s ease;
                        transform: translateY(10px);
                    }
                    .relational-cell:hover .relational-tooltip {
                        opacity: 1;
                        visibility: visible;
                        transform: translateY(0);
                    }
                    .tooltip-tree {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .tooltip-node {
                        background-color: rgba(255,255,255,0.08);
                        padding: 4px 8px;
                        border-radius: 4px;
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    .tooltip-node.root {
                        font-weight: 700;
                        color: var(--color-brand-primary);
                    }
                    .tooltip-node.active {
                        font-weight: 700;
                        background-color: rgba(255, 102, 0, 0.15);
                        border-color: var(--color-brand-primary);
                    }
                    .tooltip-arrow {
                        color: var(--color-brand-primary);
                        padding-left: 8px;
                        font-size: 10px;
                    }
                    .tooltip-sublist {
                        margin-top: 6px;
                        padding-top: 6px;
                        border-top: 1px solid rgba(255,255,255,0.15);
                    }
                    .tooltip-sublist-title {
                        font-weight: 700;
                        margin-bottom: 4px;
                        color: #93c5fd;
                    }
                    .tooltip-subitem {
                        font-size: 11px;
                        padding-left: 4px;
                        color: #e2e8f0;
                    }
                    .full-sync-overlay {
                        position: absolute;
                        inset: 0;
                        background-color: rgba(15, 23, 42, 0.75);
                        backdrop-filter: blur(4px);
                        z-index: 100;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .full-sync-card {
                        background-color: white;
                        border-radius: var(--border-radius-lg);
                        width: 480px;
                        padding: 24px;
                        box-shadow: var(--shadow-depth);
                        border: 1px solid var(--border-color);
                    }
                    .full-sync-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 10px 12px;
                        border-radius: 6px;
                        margin-bottom: 8px;
                        border: 1px solid #f1f5f9;
                        background-color: #f8fafc;
                        transition: all 0.2s ease;
                    }
                    .full-sync-item.syncing {
                        border-color: var(--color-brand-primary);
                        background-color: var(--color-bg-hover);
                    }
                    .full-sync-item.completed {
                        border-color: #bbf7d0;
                        background-color: #f0fdf4;
                    }
                    .full-sync-item.error {
                        border-color: #fecaca;
                        background-color: #fef2f2;
                    }
                `}</style>

                {/* Dashboard summary card */}
                <div className="flex justify-between items-center bg-gray-50 border rounded-lg p-4 mb-4">
                    <div>
                        <div className="text-sm font-semibold text-gray-700">Resumen de Entidad Actual:</div>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                                Por Sincronizar: {newItems.length}
                            </span>
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                                Al día / Existentes: {existingItems.length}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {newItems.length > 0 && (
                            <button
                                onClick={() => handleSync(currentKey, newItems)}
                                disabled={syncing || fullSyncing}
                                className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {syncing ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                {syncing ? 'Sincronizando...' : `Sincronizar Entidad (${newItems.length})`}
                            </button>
                        )}
                        <button
                            onClick={handleFullSync}
                            disabled={syncing || fullSyncing}
                            className="bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> Sincronización Full
                        </button>
                    </div>
                </div>

                {/* Search and Autocomplete Input */}
                <div className="relative mb-4 z-20">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                            placeholder={`Buscar por nombre, ${
                                currentKey === 'contratistas' ? 'RUT' :
                                currentKey === 'contratista_admin' || currentKey === 'administrador_contrato' ? 'email' :
                                currentKey === 'vinculaciones' ? 'RUT, servicio, contrato' : 'detalles'
                            }...`}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowSuggestions(true);
                                setCurrentPage(1);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => {
                                // Delay hiding so suggestion click can register
                                setTimeout(() => setShowSuggestions(false), 200);
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setShowSuggestions(false);
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                            {suggestions.map((suggestion, idx) => (
                                <div
                                    key={idx}
                                    className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 hover:text-orange-900 border-b last:border-b-0 border-gray-100 flex items-center justify-between"
                                    onMouseDown={() => {
                                        setSearchTerm(suggestion);
                                        setShowSuggestions(false);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <span>{suggestion}</span>
                                    <span className="text-[10px] text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded font-medium">Autocompletar</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto bg-white border rounded">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">
                                    {currentKey === 'contratista_admin' || currentKey === 'administrador_contrato' ? 'Nombre / Email' : 'Nombre / Identificador'}
                                </th>
                                {currentKey === 'subgerencias' && <th className="px-6 py-3">Gerencia</th>}
                                {currentKey === 'servicios' && <th className="px-6 py-3">Subgerencia</th>}
                                {currentKey === 'vinculaciones' && (
                                    <>
                                        <th className="px-6 py-3">Jerarquía Relacional</th>
                                        <th className="px-6 py-3">N° Contrato</th>
                                        <th className="px-6 py-3">Vigencia</th>
                                    </>
                                )}
                                <th className="px-6 py-3 text-right">Estado</th>
                                <th className="px-6 py-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((item, idx) => {
                                const itemKey = getItemKey(item, currentKey);
                                const isItemSyncing = !!syncingItems[itemKey];
                                
                                return (
                                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 relational-cell">
                                            <div className="flex items-center gap-2">
                                                <Info size={14} className="text-gray-400 shrink-0" />
                                                <span>
                                                    {currentKey === 'contratistas' ? `${item.nombre} (${item.rut})` :
                                                     currentKey === 'contratista_admin' || currentKey === 'administrador_contrato' ? `${item.nombre} (${item.email})` :
                                                     currentKey === 'vinculaciones' ? `${item.contratista} (${item.rut_contratista})` : item.nombre}
                                                </span>
                                            </div>
                                            <div className="relational-tooltip">
                                                {getRelationalTree(item, currentKey)}
                                            </div>
                                        </td>
                                        {currentKey === 'subgerencias' && <td className="px-6 py-4">{item.gerencia}</td>}
                                        {currentKey === 'servicios' && <td className="px-6 py-4">{item.subgerencia}</td>}
                                        {currentKey === 'vinculaciones' && (
                                            <>
                                                <td className="px-6 py-4 text-xs">
                                                    <div style={{ color: 'var(--color-brand-secondary)', fontWeight: 600 }}>G: {item.gerencia}</div>
                                                    <div style={{ color: 'var(--color-text-secondary)' }}>SG: {item.subgerencia}</div>
                                                    <div style={{ color: 'var(--color-text-secondary)' }}>S: {item.servicio}</div>
                                                    <div style={{ color: 'var(--color-text-secondary)' }}>D: {item.dependencia}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">
                                                    {item.estado === 'updated' ? (
                                                        <span className="text-blue-600 font-bold">{item.numero_contrato || '-'}</span>
                                                    ) : (
                                                        item.numero_contrato || '-'
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs whitespace-nowrap">
                                                    <div><strong>Inicio:</strong> {formatDate(item.fecha_inicio_contrato)}</div>
                                                    <div><strong>Fin:</strong> {item.fecha_termino_contrato ? formatDate(item.fecha_termino_contrato) : <span className="text-gray-400 italic">Indefinido</span>}</div>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            {item.estado === 'new' ? (
                                                <span className="text-orange-600 font-bold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded text-xs">Nuevo</span>
                                            ) : item.estado === 'updated' ? (
                                                <span className="text-blue-600 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">Modificado</span>
                                            ) : (
                                                <span className="text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs flex items-center gap-1 justify-end inline-flex">
                                                    <Check size={12} /> Sincronizado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(item.estado === 'new' || item.estado === 'updated') ? (
                                                <button
                                                    onClick={() => handleSingleSync(item, currentKey)}
                                                    disabled={isItemSyncing || syncing || fullSyncing}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1 ml-auto disabled:opacity-50"
                                                    title="Sincronizar este elemento individualmente"
                                                >
                                                    {isItemSyncing ? (
                                                        <Loader2 className="animate-spin w-3 h-3" />
                                                    ) : (
                                                        <RefreshCw className="w-3 h-3" />
                                                    )}
                                                    {isItemSyncing ? 'Sincronizando' : 'Sincronizar'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Listo</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedItems.length === 0 && (
                                <tr>
                                    <td colSpan={currentKey === 'vinculaciones' ? 8 : currentKey === 'subgerencias' || currentKey === 'servicios' ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                                        {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'No hay datos pendientes para mostrar en esta entidad.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border rounded text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                            <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="text-xs font-semibold text-gray-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border rounded text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                        >
                            Siguiente <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!syncing && !fullSyncing) {
                    onClose();
                }
            }}
            title={
                <div className="flex items-center gap-2">
                    <Database size={20} className="text-orange-500" />
                    <span>Sincronización de Contratistas & Entidades (Oval Control)</span>
                </div>
            }
            maxWidth="max-w-6xl"
            padding="p-0"
        >
            {loading ? (
                <div className="p-12 text-center">
                    <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Obteniendo datos de API externa y comparando...</p>
                </div>
            ) : (
                <div className="flex flex-col relative" style={{ minHeight: '620px', maxHeight: '85vh' }}>
                    
                    {/* Stepper (Fixed Top) */}
                    <div className="p-4 border-b shrink-0 bg-white">
                        <div className="sync-stepper mb-4">
                            {steps.map((s, idx) => {
                                const list = diffData ? diffData[s.key] : [];
                                const newCount = list.filter(i => i.estado === 'new' || i.estado === 'updated').length;
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => !fullSyncing && setStep(idx)}
                                        className={`sync-step-item ${idx === step ? 'active' : ''} ${idx < step ? 'completed' : ''}`}
                                    >
                                        <div className="sync-step-circle">
                                            {idx < step ? <Check size={14} /> : idx + 1}
                                        </div>
                                        <span className="sync-step-label">{s.label}</span>
                                        {newCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1 bg-orange-600 text-white rounded-full text-[9px] font-bold px-1 py-0.2 scale-90">
                                                {newCount}
                                            </span>
                                        )}
                                        {idx < steps.length - 1 && <div className="sync-step-line" />}
                                    </div>
                                );
                            })}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Layers size={18} className="text-orange-500" />
                            {steps[step]?.title}
                        </h3>
                    </div>

                    {/* Content (Table & pagination) */}
                    <div className="flex-1 p-4 min-h-0 overflow-y-auto">
                        {renderTable()}
                    </div>

                    {/* Footer Actions (Fixed Bottom) */}
                    <div className="p-4 border-t border-gray-200 bg-white shrink-0 flex justify-between">
                        <button
                            onClick={() => setStep(prev => Math.max(0, prev - 1))}
                            disabled={step === 0 || fullSyncing}
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 text-xs font-semibold"
                        >
                            Anterior
                        </button>

                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(prev => prev + 1)}
                                disabled={fullSyncing}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onSyncComplete && onSyncComplete();
                                    onClose();
                                }}
                                disabled={fullSyncing}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold disabled:opacity-50"
                            >
                                Finalizar
                            </button>
                        )}
                    </div>

                    {/* Sequential Full Sync Process Overlay */}
                    {fullSyncing && (
                        <div className="full-sync-overlay">
                            <div className="full-sync-card">
                                <div className="flex items-center justify-between border-b pb-3 mb-4">
                                    <div className="flex items-center gap-2 font-bold text-gray-800">
                                        <Server className="text-orange-500 animate-pulse w-5 h-5" />
                                        <span>Proceso de Sincronización Full</span>
                                    </div>
                                    {fullSyncProgress.every(p => p.status === 'completed' || p.status === 'error') && (
                                        <button 
                                            onClick={() => setFullSyncing(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    {fullSyncProgress.map((p, idx) => (
                                        <div key={idx} className={`full-sync-item ${p.status}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs font-semibold text-gray-700">{p.label}</div>
                                                {p.total > 0 && (
                                                    <span className="text-[10px] text-gray-500">
                                                        ({p.total} elementos)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {p.status === 'pending' && (
                                                    <span className="text-gray-400 text-xs">Pendiente</span>
                                                )}
                                                {p.status === 'syncing' && (
                                                    <div className="flex items-center gap-1 text-orange-600 font-bold text-xs">
                                                        <Loader2 className="animate-spin w-3.5 h-3.5" />
                                                        <span>Sincronizando...</span>
                                                    </div>
                                                )}
                                                {p.status === 'completed' && (
                                                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        {p.synced > 0 ? `Sincronizados: ${p.synced}` : 'Al día'}
                                                    </span>
                                                )}
                                                {p.status === 'error' && (
                                                    <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        Error
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {fullSyncProgress.every(p => p.status === 'completed' || p.status === 'error') && (
                                    <div className="mt-5 pt-3 border-t flex justify-end">
                                        <button
                                            onClick={() => {
                                                setFullSyncing(false);
                                                onSyncComplete && onSyncComplete();
                                            }}
                                            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 text-xs font-semibold transition"
                                        >
                                            Cerrar Panel de Progreso
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default SyncContratistasModal;

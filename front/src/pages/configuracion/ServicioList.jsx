// IEEE Trace: REQ-001 | Gestión de Jerarquía (Gerencias, Subgerencias y Servicios)
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { 
    Plus, Edit, Trash2, Search, ChevronRight, ChevronDown, 
    Building2, Briefcase, Settings, Tag, Users, Link2, 
    Home, Layers, Info
} from 'lucide-react';

export default function ServicioList() {
    const [hierarchy, setHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState({}); // { 'g-1': true, 's-1': true }
    const { canWrite, canExec } = useAuth();
    
    // Search filter
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchHierarchy();
    }, []);

    const fetchHierarchy = async () => {
        setLoading(true);
        try {
            const response = await api.get('/servicios/hierarchy');
            setHierarchy(response.data.data);
            
            // Auto expand first level by default if hierarchy is small
            if (response.data.data.length > 0) {
                const firstNodeId = `g-${response.data.data[0].id}`;
                setExpandedNodes(prev => ({ ...prev, [firstNodeId]: true }));
            }
        } catch (error) {
            console.error('Error loading hierarchy:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleNode = (nodeId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    const handleDelete = async (type, id) => {
        const typeLabels = { gerencia: 'Gerencia', subgerencia: 'Subgerencia', servicio: 'Servicio' };
        if (!window.confirm(`¿Está seguro de eliminar esta ${typeLabels[type]}? Se desactivará del sistema.`)) return;
        
        try {
            const endpoint = type === 'servicio' ? `/servicios/${id}` : `/${type}s/${id}`;
            await api.delete(endpoint);
            fetchHierarchy();
        } catch (error) {
            alert('Error al eliminar recurso. Verifique que no tenga elementos anidados activos.');
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Cargando Estructura Organizacional...</p>
            </div>
        </div>
    );

    return (
        <div className="organization-page min-h-screen bg-[#f8fafc] p-8">
            {/* Header Section */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="bg-[#003594] p-2 rounded-xl shadow-lg shadow-blue-100">
                                <Layers className="text-white" size={24} />
                             </div>
                             <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Gerencias, <span className="text-indigo-600">Subgerencias</span> & Servicios
                             </h1>
                        </div>
                        <p className="text-slate-500 font-medium pl-1">Gestiona la estructura jerárquica y los estándares de servicios operativos.</p>
                    </div>
                    
                    <div className="flex gap-3">
                        {canWrite('Gestion_Configuracion') && (
                            <button 
                                onClick={() => {/* Modal to add Gerencia */}}
                                className="flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                <Plus size={18} />
                                Nueva Gerencia
                            </button>
                        )}
                        <Link 
                            to="/servicios/new"
                            className="flex items-center gap-2 bg-[#003594] text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-[#002466] transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            Nuevo Servicio
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-8 relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar en la estructura..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tree Container */}
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-white p-8 overflow-hidden">
                    {hierarchy.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Info className="text-slate-300" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Estructura Vacía</h3>
                            <p className="text-slate-500">Comienza creando la primera gerencia para desplegar el árbol.</p>
                        </div>
                    ) : (
                        <div className="organization-tree">
                            {hierarchy.map(gerencia => (
                                <GerenciaNode 
                                    key={gerencia.id} 
                                    gerencia={gerencia}
                                    expandedNodes={expandedNodes}
                                    toggleNode={toggleNode}
                                    canWrite={canWrite}
                                    canExec={canExec}
                                    handleDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GerenciaNode({ gerencia, expandedNodes, toggleNode, canWrite, canExec, handleDelete }) {
    const isExpanded = expandedNodes[`g-${gerencia.id}`];

    return (
        <div className="mb-4">
            <div 
                className={`
                    group flex items-center justify-between p-5 rounded-xl transition-all cursor-pointer
                    ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'}
                `}
                onClick={() => toggleNode(`g-${gerencia.id}`)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="bg-[#003594] p-2.5 rounded-2xl shadow-lg shadow-blue-50">
                        <Building2 className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">{gerencia.nombre}</h3>
                        <p className="text-[11px] font-bold text-indigo-400 tracking-widest mt-1.5 uppercase opacity-70">
                            {gerencia.subgerencias?.length || 0} SUBGERENCIAS
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {canWrite('Gestion_Configuracion') && (
                        <>
                            <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-colors shadow-sm" title="Añadir Subgerencia">
                                <Plus size={18} />
                            </button>
                            <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-amber-600 transition-colors shadow-sm" title="Editar">
                                <Edit size={18} />
                            </button>
                        </>
                    )}
                    {canExec('Gestion_Configuracion') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete('gerencia', gerencia.id); }}
                            className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors shadow-sm" title="Eliminar">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="ml-16 mt-2 border-l-2 border-indigo-100 pl-6 space-y-2">
                    {gerencia.subgerencias?.map(sub => (
                        <SubgerenciaNode 
                            key={sub.id} 
                            sub={sub}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                            canWrite={canWrite}
                            canExec={canExec}
                            handleDelete={handleDelete}
                        />
                    ))}
                    {(!gerencia.subgerencias || gerencia.subgerencias.length === 0) && (
                        <p className="text-slate-400 text-sm italic py-2">Sin subgerencias registradas</p>
                    )}
                </div>
            )}
        </div>
    );
}

function SubgerenciaNode({ sub, expandedNodes, toggleNode, canWrite, canExec, handleDelete }) {
    const isExpanded = expandedNodes[`s-${sub.id}`];

    return (
        <div className="mb-2">
            <div 
                className={`
                    group flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer
                    ${isExpanded ? 'bg-amber-50/40' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'}
                `}
                onClick={() => toggleNode(`s-${sub.id}`)}
            >
                <div className="flex items-center gap-4">
                    <div className="text-slate-300">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-100">
                        <Briefcase className="text-white" size={18} />
                    </div>
                    <div>
                        <h4 className="text-base font-extrabold text-slate-700 tracking-tight leading-none uppercase">{sub.nombre}</h4>
                        <p className="text-[10px] font-bold text-amber-500 tracking-widest mt-1 uppercase opacity-70">
                            {sub.servicios?.length || 0} SERVICIOS OPERATIVOS
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                     {canWrite('Gestion_Configuracion') && (
                        <>
                             <Link 
                                to={`/servicios/new?subgerencia_id=${sub.id}`}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-amber-600 transition-colors shadow-sm" 
                                title="Añadir Servicio"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Plus size={16} />
                            </Link>
                            <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-amber-600 transition-colors shadow-sm" title="Editar">
                                <Edit size={16} />
                            </button>
                        </>
                    )}
                    {canExec('Gestion_Configuracion') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete('subgerencia', sub.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm" title="Eliminar">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="ml-12 mt-2 border-l-2 border-amber-100 pl-6 gap-2 flex flex-col">
                    {sub.servicios?.map(serv => (
                        <ServicioNode 
                            key={serv.id} 
                            servicio={serv}
                            canWrite={canWrite}
                            canExec={canExec}
                            handleDelete={handleDelete}
                        />
                    ))}
                    {(!sub.servicios || sub.servicios.length === 0) && (
                        <p className="text-slate-400 text-xs italic py-1">Sin servicios vinculados</p>
                    )}
                </div>
            )}
        </div>
    );
}

function ServicioNode({ servicio, canWrite, canExec, handleDelete }) {
    return (
        <div className="group flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500 rounded-lg shadow-md shadow-emerald-50">
                    <Tag className="text-white" size={14} />
                </div>
                <div>
                    <h5 className="text-sm font-bold text-slate-800">{servicio.nombre}</h5>
                    <div className="flex gap-4 mt-1">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                            <Link2 size={10} /> {servicio.vinculaciones_count || 0} VINCULACIONES
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                            <Users size={10} /> {servicio.contratistas_count || 0} CONTRATISTAS
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <Link to={`/servicios/${servicio.id}/edit`} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit size={14} />
                </Link>
                <button 
                    onClick={() => handleDelete('servicio', servicio.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

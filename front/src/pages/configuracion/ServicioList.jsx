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
import './ServicioList.css';

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
        <div className="organization-page">
            {/* Header Section */}
            <header className="page-header" style={{ maxWidth: '1200px', margin: '0 auto 2rem auto' }}>
                <div>
                    <h1 className="page-title">
                        Gerencias, Subgerencias & Servicios
                    </h1>
                    <p className="page-subtitle">Gestiona la estructura jerárquica y los estándares de servicios operativos.</p>
                </div>
                
                {/* Actions removed - structure managed via sync */}
            </header>

            {/* Filters */}
            <div style={{ maxWidth: '1200px', margin: '0 auto 2rem auto' }}>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar en la estructura..."
                        className="form-control"
                        style={{ paddingLeft: '40px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tree Container */}
            <div className="tree-container">
                {hierarchy.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <Info style={{ color: '#cbd5e1', marginBottom: '1rem' }} size={48} />
                        <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>Estructura Vacía</h3>
                        <p style={{ color: '#64748b' }}>Comienza creando la primera gerencia para desplegar el árbol.</p>
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
    );
}

function GerenciaNode({ gerencia, expandedNodes, toggleNode, canWrite, canExec, handleDelete }) {
    const isExpanded = expandedNodes[`g-${gerencia.id}`];

    return (
        <div className="tree-node tree-node--gerencia">
            <div 
                className={`tree-node-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleNode(`g-${gerencia.id}`)}
            >
                <div className="node-info">
                    <div className="node-toggle-icon">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="node-icon-wrapper">
                        <Building2 size={20} />
                    </div>
                    <div>
                        <h3 className="node-title">{gerencia.nombre}</h3>
                        <p className="node-subtitle">
                            {gerencia.subgerencias?.length || 0} SUBGERENCIAS
                        </p>
                    </div>
                </div>

                <div className="node-actions">
                    {canWrite('Gestion_Configuracion') && (
                        <>
                            <button className="node-action-btn" title="Añadir Subgerencia">
                                <Plus size={18} />
                            </button>
                            <button className="node-action-btn" title="Editar">
                                <Edit size={18} />
                            </button>
                        </>
                    )}
                    {canExec('Gestion_Configuracion') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete('gerencia', gerencia.id); }}
                            className="node-action-btn danger" title="Eliminar">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="sub-tree">
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
                        <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>Sin subgerencias registradas</p>
                    )}
                </div>
            )}
        </div>
    );
}

function SubgerenciaNode({ sub, expandedNodes, toggleNode, canWrite, canExec, handleDelete }) {
    const isExpanded = expandedNodes[`s-${sub.id}`];

    return (
        <div className="tree-node tree-node--subgerencia">
            <div 
                className={`tree-node-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleNode(`s-${sub.id}`)}
            >
                <div className="node-info">
                    <div className="node-toggle-icon">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div className="node-icon-wrapper">
                        <Briefcase size={18} />
                    </div>
                    <div>
                        <h4 className="node-title">{sub.nombre}</h4>
                        <p className="node-subtitle">
                            {sub.servicios?.length || 0} SERVICIOS OPERATIVOS
                        </p>
                    </div>
                </div>

                <div className="node-actions">
                     {canWrite('Gestion_Configuracion') && (
                        <>
                             <Link 
                                to={`/servicios/new?subgerencia_id=${sub.id}`}
                                className="node-action-btn" 
                                title="Añadir Servicio"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Plus size={16} />
                            </Link>
                            <button className="node-action-btn" title="Editar">
                                <Edit size={16} />
                            </button>
                        </>
                    )}
                    {canExec('Gestion_Configuracion') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete('subgerencia', sub.id); }}
                            className="node-action-btn danger" title="Eliminar">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="sub-tree">
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
                        <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>Sin servicios vinculados</p>
                    )}
                </div>
            )}
        </div>
    );
}

function ServicioNode({ servicio, canWrite, canExec, handleDelete }) {
    return (
        <div className="tree-node tree-node--servicio">
            <div className="tree-node-header" style={{ cursor: 'default' }}>
                <div className="node-info">
                    <div className="node-icon-wrapper">
                        <Tag size={14} />
                    </div>
                    <div>
                        <h5 className="node-title" style={{ fontSize: '0.9rem' }}>{servicio.nombre}</h5>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Link2 size={10} /> {servicio.vinculaciones_count || 0} VINCULACIONES
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Users size={10} /> {servicio.contratistas_count || 0} CONTRATISTAS
                            </span>
                        </div>
                    </div>
                </div>

                <div className="node-actions">
                    {canWrite('Gestion_Configuracion') && (
                        <Link to={`/servicios/${servicio.id}/edit`} className="node-action-btn" title="Editar">
                            <Edit size={14} />
                        </Link>
                    )}
                    {canExec('Gestion_Configuracion') && (
                        <button 
                            onClick={() => handleDelete('servicio', servicio.id)}
                            className="node-action-btn danger" title="Eliminar">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

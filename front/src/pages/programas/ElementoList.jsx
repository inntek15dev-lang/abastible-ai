// IEEE Trace: REQ-001 | US-001 | pages/programas/ElementoList.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { Plus, Edit, Trash2, ArrowLeft, FolderOpen, Pencil, Paperclip } from 'lucide-react';
import './ElementoList.css';

export default function ElementoList() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const programId = searchParams.get('programa_id');

    const [program, setProgram] = useState(null);
    const [elementos, setElementos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canWrite, canExec } = useAuth();

    // Modal states (reused from previous logic, simplified for brevity here)
    // In a real refactor, these should be separate components or keep existing modal logic.
    // implementing visual structure first.
    // Modal logic removed - functionality moved to ActividadForm page

    useEffect(() => {
        if (programId) {
            fetchProgramData();
        } else {
            setError("No se ha seleccionado un programa válido.");
            setLoading(false);
        }
    }, [programId]);



    const fetchProgramData = async () => {
        setLoading(true);
        try {
            // Fetch Program Details
            const progRes = await api.get(`/programas/${programId}`);
            setProgram(progRes.data.data);

            // Fetch Elements for this program
            const elemRes = await api.get(`/elementos?programa_id=${programId}`);
            setElementos(elemRes.data.data);
        } catch (err) {
            setError('Error al cargar datos del programa.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Cargando...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!program) return <div className="error-message">Programa no encontrado</div>;

    // Calculate stats
    const totalActivities = elementos.reduce((acc, el) => acc + (el.actividades?.length || 0), 0);

    return (
        <div className="page-container-elements">
            {/* 1. Header Area */}
            <header className="elements-header">
                <div className="header-left">
                    <button onClick={() => navigate('/programas')} className="btn-back-circle" title="Volver a Programas">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="program-info-block">
                        <span className="program-badge">{program.codigo || `PROG-${program.id}`}</span>
                        <h1>
                            <span role="img" aria-label="doc">📄</span> {program.nombre}
                        </h1>
                    </div>
                </div>
                {canWrite('Programas') && (
                    <Link to={`/programas/${program.id}/edit`} className="btn-edit-program">
                        <Pencil size={16} /> Editar Programa
                    </Link>
                )}
            </header>

            {/* 2. Stats Dashboard */}
            <div className="stats-dashboard">
                <div className="stats-grid">
                    <div className="stat-box">
                        <span className="stat-value">{program.meta_cumplimiento || 85}%</span>
                        <span className="stat-label">Meta de Cumplimiento</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value green">{elementos.length}</span>
                        <span className="stat-label">Elementos</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value purple">{totalActivities}</span>
                        <span className="stat-label">Actividades Totales</span>
                    </div>
                </div>
                <p className="program-description-text">
                    {program.descripcion || 'Sin descripción.'}
                </p>
            </div>

            {/* 3. Elements Section Header */}
            <div className="elements-section-header">
                <div className="section-title">
                    <FolderOpen size={20} />
                    <span>Elementos y Actividades</span>
                </div>
                {canWrite('Programas') && (
                    <Link to={`/elementos/new?programa_id=${program.id}`} className="btn-new-element">
                        <Plus size={16} /> Nuevo Elemento
                    </Link>
                )}
            </div>

            {/* 4. Elements List */}
            <div>
                {elementos.length === 0 ? (
                    <div className="element-container" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                        No hay elementos definidos para este programa.
                    </div>
                ) : (
                    elementos.map((elem, index) => (
                        <div key={elem.id} className="element-container">
                            {/* Element Header */}
                            <div className="element-header-row">
                                <div className="element-info">
                                    <div className="element-number-circle">{elem.numero}</div>
                                    <div className="element-title-block">
                                        <h3>{elem.nombre}</h3>
                                        <p className="element-subtitle">{elem.actividades?.length || 0} actividades</p>
                                    </div>
                                </div>
                                <div className="element-actions">
                                    {canWrite('Programas') && (
                                        <>
                                            <button
                                                className="btn-add-activity"
                                                onClick={() => navigate('/actividades/new', { state: { elemento_id: elem.id } })}
                                            >
                                                <Plus size={14} /> Actividad
                                            </button>
                                            <Link to={`/elementos/${elem.id}/edit`} className="btn-edit-text">
                                                <Pencil size={14} /> Editar
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Activities Table (if any) */}
                            {elem.actividades && elem.actividades.length > 0 && (
                                <div className="activities-table-wrapper">
                                    <table className="activities-table">
                                        <thead>
                                            <tr>
                                                <th className="code-col">Cód</th>
                                                <th className="activity-col">Actividad</th>
                                                <th className="desc-col">Descripción</th>
                                                <th className="criteria-col" style={{ width: '25%' }}>CRITERIOS</th>
                                                <th className="freq-col" style={{ width: '10%' }}>FRECUENCIA</th>
                                                <th className="meta-col" style={{ width: '10%' }}>EVIDENCIA</th>
                                                <th style={{ width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {elem.actividades.map(act => (
                                                <tr key={act.id}>
                                                    <td><span className="badge-code">{act.codigo}</span></td>
                                                    <td>{act.nombre || act.actividad || 'Actividad...'}</td>
                                                    <td>{act.descripcion}</td>
                                                    <td>{act.criterios || '-'}</td>
                                                    <td>{act.frecuencia}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {act.template_url ? (
                                                            <a
                                                                href={`${(window.ENV && window.ENV.VITE_API_URL) ? window.ENV.VITE_API_URL : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')}/${act.template_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn-icon-only"
                                                                title="Descargar plantilla"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#2563eb',
                                                                    textDecoration: 'none'
                                                                }}
                                                            >
                                                                <Paperclip size={16} />
                                                            </a>
                                                        ) : (
                                                            (act.requiere_evidencia ? <span title="Requiere evidencia, sin plantilla" style={{ color: '#d1d5db' }}>-</span> : <span style={{ color: '#9ca3af' }}>-</span>)
                                                        )}
                                                    </td>
                                                    <td>
                                                        {canWrite('Programas') && (
                                                            <button
                                                                className="btn-icon-only"
                                                                onClick={() => navigate(`/actividades/${act.id}/edit`)}
                                                                title="Editar actividad"
                                                            >
                                                                <Pencil size={14} className="text-gray-500 hover:text-blue-600" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            {/* Activity Modal Removed - Moved to separate view per Parko */}
        </div >
    );
}

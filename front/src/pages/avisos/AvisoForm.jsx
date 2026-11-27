import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Megaphone,
    ArrowLeft,
    Save,
    Calendar,
    Users,
    FileText,
    Eye,
    CheckSquare,
    Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import RichHtmlEditor from '../../components/avisos/RichHtmlEditor';
import './AvisoForm.css';

export default function AvisoForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [showLivePreview, setShowLivePreview] = useState(false);

    // Initial dates: today and 15 days ahead
    const todayStr = new Date().toISOString().slice(0, 10);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const futureStr = futureDate.toISOString().slice(0, 10);

    const [form, setForm] = useState({
        titulo: '',
        contenido: '<p>Estimados usuarios,</p><p>Les comunicamos que...</p>',
        fecha_desde: todayStr,
        fecha_hasta: futureStr,
        para_todos: true,
        roles: [],
        activo: true
    });

    const AVAILABLE_ROLES = [
        { key: 'admin', label: 'Administrador (Dios)', desc: 'Control total de la plataforma' },
        { key: 'oval', label: 'Auditor / Supervisor OVAL', desc: 'Validación técnica y auditoría' },
        { key: 'administrador_contrato', label: 'Administrador de Contrato', desc: 'Gestión Abastible' },
        { key: 'contratista_admin', label: 'Administrador EECC', desc: 'Jefatura contratista' },
        { key: 'contratista_user', label: 'Operativo EECC', desc: 'Cargadores y supervisores' }
    ];

    useEffect(() => {
        if (isEdit) {
            setLoading(true);
            api.get(`/avisos/${id}`)
                .then(res => {
                    const data = res.data?.data;
                    if (data) {
                        setForm({
                            titulo: data.titulo || '',
                            contenido: data.contenido || '',
                            fecha_desde: data.fecha_desde ? String(data.fecha_desde).slice(0, 10) : todayStr,
                            fecha_hasta: data.fecha_hasta ? String(data.fecha_hasta).slice(0, 10) : futureStr,
                            para_todos: Boolean(data.para_todos),
                            roles: Array.isArray(data.roles) ? data.roles : [],
                            activo: Boolean(data.activo)
                        });
                    }
                })
                .catch(err => {
                    console.error('Error fetching aviso details:', err);
                    toast.error('Error al cargar datos del aviso');
                    navigate('/avisos');
                })
                .finally(() => setLoading(false));
        }
    }, [id, isEdit, navigate, todayStr, futureStr]);

    const handleRoleToggle = (roleKey) => {
        setForm(prev => {
            const exists = prev.roles.includes(roleKey);
            const nextRoles = exists
                ? prev.roles.filter(r => r !== roleKey)
                : [...prev.roles, roleKey];
            return {
                ...prev,
                roles: nextRoles
            };
        });
    };

    const handleSelectAllRoles = () => {
        setForm(prev => ({
            ...prev,
            roles: AVAILABLE_ROLES.map(r => r.key)
        }));
    };

    const handleDeselectAllRoles = () => {
        setForm(prev => ({
            ...prev,
            roles: []
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.titulo.trim()) {
            toast.error('Por favor ingrese el título del aviso');
            return;
        }

        if (!form.contenido.trim()) {
            toast.error('Por favor ingrese el contenido del comunicado');
            return;
        }

        if (form.fecha_hasta < form.fecha_desde) {
            toast.error('La fecha de término no puede ser anterior a la fecha de inicio');
            return;
        }

        if (!form.para_todos && form.roles.length === 0) {
            toast.error('Debe seleccionar al menos un rol destinatario o marcar "Visible para todos"');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                titulo: form.titulo.trim(),
                contenido: form.contenido,
                fecha_desde: form.fecha_desde,
                fecha_hasta: form.fecha_hasta,
                para_todos: form.para_todos,
                roles: form.para_todos ? [] : form.roles,
                activo: form.activo
            };

            if (isEdit) {
                await api.put(`/avisos/${id}`, payload);
                toast.success('Aviso actualizado correctamente');
            } else {
                await api.post('/avisos', payload);
                toast.success('Aviso creado y publicado con éxito');
            }

            navigate('/avisos');
        } catch (error) {
            console.error('Error saving aviso:', error);
            toast.error(error.response?.data?.message || 'Error al guardar el aviso');
        } finally {
            setSaving(false);
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="aviso-form-container">
                <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
                    Acceso denegado: Solo el Administrador (Dios) puede gestionar avisos.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="aviso-form-container">
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    Cargando formulario de aviso...
                </div>
            </div>
        );
    }

    return (
        <div className="aviso-form-container">
            {/* Header */}
            <div className="aviso-form-header">
                <div className="aviso-form-title">
                    <Megaphone size={26} style={{ color: '#003594' }} />
                    <h1>{isEdit ? 'Editar Comunicado Oficial' : 'Nuevo Comunicado Oficial'}</h1>
                </div>
                <Link to="/avisos" className="aviso-back-btn">
                    <ArrowLeft size={16} /> Volver a Avisos
                </Link>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="aviso-form-card">
                    {/* Sección 1: Datos Básicos */}
                    <div className="aviso-card-section">
                        <div className="section-legend">
                            <FileText size={18} style={{ color: '#003594' }} />
                            1. Información General del Aviso
                        </div>

                        <div className="form-field">
                            <label className="form-label">
                                Título del Aviso / Asunto <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: Mantenimiento Programado de Plataforma OVAL / Actualización de Estándares"
                                value={form.titulo}
                                onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="form-grid-2" style={{ marginTop: 14 }}>
                            <div className="form-field">
                                <label className="form-label">
                                    <Calendar size={14} /> Fecha Desde (Inicio vigencia) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={form.fecha_desde}
                                    onChange={(e) => setForm(prev => ({ ...prev, fecha_desde: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label className="form-label">
                                    <Calendar size={14} /> Fecha Hasta (Término vigencia) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={form.fecha_hasta}
                                    onChange={(e) => setForm(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <label className="checkbox-pill-item">
                                <input
                                    type="checkbox"
                                    checked={form.activo}
                                    onChange={(e) => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                                    style={{ width: 16, height: 16, accentColor: '#003594' }}
                                />
                                <span>Aviso Activo (Si está desactivado no aparecerá en el popup a los usuarios)</span>
                            </label>
                        </div>
                    </div>

                    {/* Sección 2: Audiencia y Segmentación por Roles */}
                    <div className="aviso-card-section">
                        <div className="section-legend">
                            <Users size={18} style={{ color: '#FE5000' }} />
                            2. Audiencia y Segmentación por Roles
                        </div>

                        <div className="audience-card">
                            <label className="checkbox-pill-item">
                                <input
                                    type="checkbox"
                                    checked={form.para_todos}
                                    onChange={(e) => setForm(prev => ({ ...prev, para_todos: e.target.checked }))}
                                    style={{ width: 18, height: 18, accentColor: '#003594' }}
                                />
                                <span>Visible para TODOS los usuarios (sin restricción de rol)</span>
                            </label>

                            {!form.para_todos && (
                                <div style={{ marginTop: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                                            Seleccione los roles destinatarios:
                                        </span>
                                        <div className="role-actions-bar">
                                            <button
                                                type="button"
                                                className="role-quick-btn"
                                                onClick={handleSelectAllRoles}
                                            >
                                                Seleccionar Todos
                                            </button>
                                            <span style={{ color: '#cbd5e1' }}>|</span>
                                            <button
                                                type="button"
                                                className="role-quick-btn"
                                                onClick={handleDeselectAllRoles}
                                            >
                                                Deseleccionar Todos
                                            </button>
                                        </div>
                                    </div>

                                    <div className="roles-grid">
                                        {AVAILABLE_ROLES.map((r) => {
                                            const isSelected = form.roles.includes(r.key);
                                            return (
                                                <label
                                                    key={r.key}
                                                    className={`role-checkbox-card ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleRoleToggle(r.key)}
                                                        style={{ accentColor: '#003594' }}
                                                    />
                                                    <div>
                                                        <div>{r.label}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                            {r.desc}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sección 3: Editor HTML Embellecido */}
                    <div className="aviso-card-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div className="section-legend" style={{ margin: 0 }}>
                                <FileText size={18} style={{ color: '#003594' }} />
                                3. Contenido del Comunicado (Formato Embellecido HTML)
                            </div>
                            <button
                                type="button"
                                className="role-quick-btn"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setShowLivePreview(prev => !prev)}
                            >
                                <Eye size={14} /> {showLivePreview ? 'Ocultar Vista Previa' : 'Ver Vista Previa en Vivo'}
                            </button>
                        </div>

                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px 0' }}>
                            Utilice las herramientas de la barra para formatear el texto, aplicar colores corporativos, crear listas e insertar recuadros destacados de aviso.
                        </p>

                        <RichHtmlEditor
                            value={form.contenido}
                            onChange={(html) => setForm(prev => ({ ...prev, contenido: html }))}
                            placeholder="Redacte aquí el comunicado oficial..."
                        />

                        {/* Live Preview Box */}
                        {showLivePreview && (
                            <div className="live-preview-box">
                                <div className="preview-bar-header">
                                    <span>VISTA PREVIA DEL COMUNICADO</span>
                                    <span>{form.titulo || 'Sin título'}</span>
                                </div>
                                <div className="preview-content-render">
                                    <div
                                        className="aviso-html-content"
                                        dangerouslySetInnerHTML={{ __html: form.contenido }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="aviso-form-actions">
                        <Link to="/avisos" className="btn-secondary">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={saving}
                        >
                            <Save size={16} />
                            {saving ? 'Guardando...' : (isEdit ? 'Actualizar Aviso' : 'Guardar y Publicar')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}


// IEEE Trace: REQ-001 | ServicioForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { Save, ArrowLeft, Edit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ServicioForm() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    useEffect(() => {
        if (user?.role === 'administrador_contrato') {
            navigate('/servicios');
        }
    }, [user, navigate]);

    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        programa_id: '',
        subgerencia_id: '',
        activo: 1
    });
    const [programas, setProgramas] = useState([]);
    const [gerencias, setGerencias] = useState([]);
    const [subgerencias, setSubgerencias] = useState([]);
    const [selectedGerenciaId, setSelectedGerenciaId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProgramas();
        fetchGerencias();
        fetchSubgerencias();
        
        // Handle subgerencia_id from URL query params
        const params = new URLSearchParams(window.location.search);
        const subId = params.get('subgerencia_id');
        if (subId && !isEdit) {
            setForm(prev => ({ ...prev, subgerencia_id: subId }));
        }

        if (isEdit) {
            fetchServicio();
        }
    }, [id]);

    useEffect(() => {
        if (form.subgerencia_id && subgerencias.length > 0 && !selectedGerenciaId) {
            const sub = subgerencias.find(s => String(s.id) === String(form.subgerencia_id));
            if (sub) {
                setSelectedGerenciaId(sub.gerencia_id);
            }
        }
    }, [form.subgerencia_id, subgerencias, selectedGerenciaId]);

    const fetchProgramas = async () => {
        try {
            const response = await api.get('/programas');
            setProgramas(response.data.data);
        } catch (err) {
            console.error('Error loading programs');
        }
    };

    const fetchGerencias = async () => {
        try {
            const response = await api.get('/resources/gerencias');
            setGerencias(response.data.data);
        } catch (err) {
            console.error('Error loading gerencias');
        }
    };

    const fetchSubgerencias = async () => {
        try {
            const response = await api.get('/resources/subgerencias');
            setSubgerencias(response.data.data);
        } catch (err) {
            console.error('Error loading subgerencias');
        }
    };

    const fetchServicio = async () => {
        try {
            const response = await api.get(`/servicios/${id}`);
            const data = response.data.data;
            setForm({
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                programa_id: data.programa_id || '',
                subgerencia_id: data.subgerencia_id || '',
                activo: data.activo
            });
            if (data.subgerencia && data.subgerencia.gerencia_id) {
                setSelectedGerenciaId(data.subgerencia.gerencia_id);
            }
        } catch (err) {
            setError('Error al cargar datos');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEdit) {
                await api.put(`/servicios/${id}`, form);
            } else {
                await api.post('/servicios', form);
            }
            navigate('/servicios');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '64px 24px', fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' },
        wrapper: { maxWidth: '1000px', margin: '0 auto' },
        header: { marginBottom: '40px' },
        backBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px', padding: 0, transition: 'color 0.2s' },
        titleRow: { display: 'flex', alignItems: 'center', gap: '20px' },
        iconBox: { width: '56px', height: '56px', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        title: { fontSize: '36px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.04em' },
        subtitle: { color: '#64748b', fontSize: '15px', margin: '6px 0 0 0', fontWeight: 450 },
        card: { backgroundColor: '#ffffff', borderRadius: '48px', boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.08)', border: '1px solid #ffffff', padding: '80px', position: 'relative', overflow: 'hidden' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px' },
        field: { display: 'flex', flexDirection: 'column', gap: '8px' },
        fullWidth: { gridColumn: '1 / -1' },
        label: { fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', paddingLeft: '4px' },
        input: { padding: '18px 28px', borderRadius: '24px', border: '2px solid #f1f5f9', backgroundColor: '#fbfcfd', fontSize: '16px', color: '#1e293b', outline: 'none', transition: 'all 0.3s ease', fontWeight: 600, width: '100%', boxSizing: 'border-box' },
        select: { padding: '18px 28px', borderRadius: '24px', border: '2px solid #f1f5f9', backgroundColor: '#fbfcfd', fontSize: '16px', color: '#1e293b', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 24px center', backgroundSize: '18px', width: '100%', boxSizing: 'border-box' },
        textArea: { padding: '24px 28px', borderRadius: '24px', border: '2px solid #f1f5f9', backgroundColor: '#fbfcfd', fontSize: '16px', color: '#1e293b', outline: 'none', resize: 'none', minHeight: '140px', lineHeight: '1.6', width: '100%', boxSizing: 'border-box' },
        statusBox: { backgroundColor: '#f8fafc', padding: '24px 32px', borderRadius: '28px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', marginTop: '10px' },
        checkbox: { width: '28px', height: '28px', borderRadius: '10px', border: '2px solid #e2e8f0', appearance: 'none', backgroundColor: '#fff', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        footer: { display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '56px', paddingTop: '40px', borderTop: '1px solid #f8fafc' },
        btnCancel: { background: 'none', border: 'none', color: '#94a3b8', padding: '18px 32px', borderRadius: '24px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', cursor: 'pointer', transition: 'all 0.2s' },
        btnSubmit: { backgroundColor: '#0f172a', color: '#fff', padding: '18px 48px', borderRadius: '24px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', alignItems: 'center', gap: '12px' }
    };
    
    const filteredSubgerencias = subgerencias.filter(s => String(s.gerencia_id) === String(selectedGerenciaId));

    return (
        <div style={styles.container}>
            <div style={styles.wrapper}>
                {/* Header Section */}
                <div style={styles.header}>
                    <button onClick={() => navigate(-1)} style={styles.backBtn}>
                        <ArrowLeft size={16} /> Regresar
                    </button>
                    <div style={styles.titleRow}>
                        <div style={styles.iconBox}>
                            <Edit size={28} color="#3b82f6" />
                        </div>
                        <div>
                            <h1 style={styles.title}>{isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h1>
                            <p style={styles.subtitle}>
                                {isEdit ? `Gestión de parámetros para ${form.nombre}` : 'Inicie la configuración del nuevo servicio operativo'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Card Section */}
                <div style={styles.card}>
                    {/* Decorative element */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle at top right, #f8fafc, transparent)', zIndex: 0 }}></div>

                    <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
                        {error && (
                            <div style={{ marginBottom: '40px', padding: '24px 32px', backgroundColor: '#fef2f2', borderRadius: '24px', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ minWidth: '8px', minHeight: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                                {error}
                            </div>
                        )}

                        <div style={styles.grid}>
                            <div style={styles.field}>
                                <label style={styles.label}>Código de Referencia</label>
                                <div style={{ ...styles.input, backgroundColor: '#f8fafc', color: '#94a3b8', borderStyle: 'dashed', display: 'flex', alignItems: 'center' }}>
                                    {isEdit ? `SVR-${id.padStart(3, '0')}` : 'SYS-AUTO-GENERATED'}
                                </div>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Programa Asociado</label>
                                <select
                                    style={styles.select}
                                    value={form.programa_id}
                                    onChange={(e) => setForm({ ...form, programa_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione un programa...</option>
                                    {programas.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Gerencia</label>
                                <select
                                    style={styles.select}
                                    value={selectedGerenciaId}
                                    onChange={(e) => {
                                        setSelectedGerenciaId(e.target.value);
                                        setForm(prev => ({ ...prev, subgerencia_id: '' }));
                                    }}
                                    required
                                >
                                    <option value="">Seleccione una gerencia...</option>
                                    {gerencias.map(g => (
                                        <option key={g.id} value={g.id}>{g.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>Subgerencia Responsable</label>
                                <select
                                    style={styles.select}
                                    value={form.subgerencia_id}
                                    onChange={(e) => setForm({ ...form, subgerencia_id: e.target.value })}
                                    required
                                    disabled={!selectedGerenciaId}
                                >
                                    <option value="">
                                        {selectedGerenciaId ? 'Seleccione una subgerencia...' : 'Seleccione primero una gerencia'}
                                    </option>
                                    {filteredSubgerencias.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ ...styles.field, ...styles.fullWidth }}>
                                <label style={styles.label}>Nombre del Servicio</label>
                                <input
                                    type="text"
                                    style={styles.input}
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej: MANTENIMIENTO PREVENTIVO ELECTRICO"
                                    required
                                />
                            </div>

                            <div style={{ ...styles.field, ...styles.fullWidth }}>
                                <label style={styles.label}>Descripción General</label>
                                <textarea
                                    style={styles.textArea}
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="Especifique el alcance técnico y detalles operativos de este servicio..."
                                />
                            </div>

                            <div style={{ ...styles.field, ...styles.fullWidth }}>
                                <div style={styles.statusBox} onClick={() => setForm({ ...form, activo: form.activo === 1 ? 0 : 1 })}>
                                    <div style={{
                                        ...styles.checkbox,
                                        backgroundColor: form.activo === 1 ? '#3b82f6' : '#fff',
                                        borderColor: form.activo === 1 ? '#3b82f6' : '#e2e8f0'
                                    }}>
                                        {form.activo === 1 && (
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fff' }}></div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>Servicio Operativo</div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Permitir nuevas vinculaciones en terreno</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.footer}>
                            <button type="button" onClick={() => navigate(-1)} style={styles.btnCancel}>Descartar</button>
                            <button type="submit" disabled={loading} style={{ ...styles.btnSubmit, opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Procesando...' : (
                                    <>
                                        <Save size={20} />
                                        {isEdit ? 'Guardar Cambios' : 'Crear Servicio'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

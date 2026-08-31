import React, { useState, useEffect } from 'react';
import api from '../../api';
import { 
    Building2, 
    FileCheck, 
    ChevronDown, 
    ChevronUp, 
    Info,
    RefreshCw,
    FileDown,
    FileText,
    Send,
    Calendar
} from 'lucide-react';
import './OvalBilling.css';

export default function OvalBilling() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [email, setEmail] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [periodoFilter, setPeriodoFilter] = useState('');

    const currentYear = new Date().getFullYear();
    const monthOptions = [
        { value: '', label: 'Todos los periodos' },
        { value: `${currentYear}-01`, label: `Enero ${currentYear}` },
        { value: `${currentYear}-02`, label: `Febrero ${currentYear}` },
        { value: `${currentYear}-03`, label: `Marzo ${currentYear}` },
        { value: `${currentYear}-04`, label: `Abril ${currentYear}` },
        { value: `${currentYear}-05`, label: `Mayo ${currentYear}` },
        { value: `${currentYear}-06`, label: `Junio ${currentYear}` },
        { value: `${currentYear}-07`, label: `Julio ${currentYear}` },
        { value: `${currentYear}-08`, label: `Agosto ${currentYear}` },
        { value: `${currentYear}-09`, label: `Septiembre ${currentYear}` },
        { value: `${currentYear}-10`, label: `Octubre ${currentYear}` },
        { value: `${currentYear}-11`, label: `Noviembre ${currentYear}` },
        { value: `${currentYear}-12`, label: `Diciembre ${currentYear}` }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (periodo = periodoFilter) => {
        try {
            setLoading(true);
            const params = {};
            if (periodo) params.periodo = periodo;
            const response = await api.get('/reportes/oval/billing', { params });
            setData(response.data.data);
        } catch (err) {
            console.error('Error fetching billing data:', err);
            setError('Error al cargar el reporte de facturación');
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodoChange = (e) => {
        const val = e.target.value;
        setPeriodoFilter(val);
        fetchData(val);
    };

    const handleExportPdf = () => {
        const query = periodoFilter ? `?periodo=${periodoFilter}` : '';
        const tokenQuery = `${query ? '&' : '?'}token=${localStorage.getItem('token')}`;
        window.open(`${api.defaults.baseURL}/reportes/oval/billing/pdf${query}${tokenQuery}`, '_blank');
    };

    const handleExportExcel = () => {
        const query = periodoFilter ? `?periodo=${periodoFilter}` : '';
        const tokenQuery = `${query ? '&' : '?'}token=${localStorage.getItem('token')}`;
        window.open(`${api.defaults.baseURL}/reportes/oval/billing/excel${query}${tokenQuery}`, '_blank');
    };

    const handleSendEmail = async () => {
        if (!email) return alert('Por favor ingrese un email');
        try {
            setSendingEmail(true);
            const response = await api.post('/reportes/oval/billing/send', { email, periodo: periodoFilter });
            alert(response.data.message);
            setEmail('');
        } catch (err) {
            console.error('Error sending email:', err);
            alert('Error al enviar el reporte por email');
        } finally {
            setSendingEmail(false);
        }
    };

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    if (loading && !data) return <div className="loading">Cargando reporte de facturación...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const { resumen, contratistas } = data;

    return (
        <div className="oval-page">
            <header className="oval-header">
                <h1>Reporte de Facturación OVAL</h1>
                <p>Resumen cuantitativo de contratos facturables por empresa contratista.</p>
            </header>

            {/* Period Selector Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.25rem' }}>
                <Calendar size={20} style={{ color: '#4f46e5' }} />
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', margin: 0 }}>Periodo de Facturación:</label>
                <select
                    value={periodoFilter}
                    onChange={handlePeriodoChange}
                    style={{ width: '220px', padding: '0.45rem 0.85rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#1e293b', cursor: 'pointer' }}
                >
                    {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {data?.periodoFiltro && (
                    <span style={{ fontSize: '0.8rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.75rem', borderRadius: '6px', fontWeight: 600 }}>
                        Filtro activo: {data.periodoFiltro}
                    </span>
                )}
            </div>

            {/* Actions Bar */}
            <div className="oval-actions-bar">
                <div className="send-email-form">
                    <input 
                        type="email" 
                        placeholder="email@ejemplo.com" 
                        className="email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button 
                        className="btn-send-email" 
                        onClick={handleSendEmail}
                        disabled={sendingEmail || !email}
                    >
                        {sendingEmail ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                        Enviar Reporte
                    </button>
                </div>
                
                <button className="btn-export excel" onClick={handleExportExcel}>
                    <FileDown size={18} />
                    Exportar Excel
                </button>
                <button className="btn-export pdf" onClick={handleExportPdf}>
                    <FileText size={18} />
                    Exportar PDF
                </button>
            </div>

            {/* Stats Overview */}
            <div className="oval-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{resumen.totalContratistas}</span>
                        <span className="stat-label">Contratistas Totales</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">
                        <FileCheck size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{resumen.totalContratosFacturables}</span>
                        <span className="stat-label">Contratos Facturables</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="oval-table-container">
                <table className="oval-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Empresa Contratista</th>
                            <th>RUT</th>
                            <th>Total Contratos</th>
                            <th>Contratos Facturables</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contratistas.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center py-8 text-gray-500 italic">No se encontraron datos de facturación para el período seleccionado</td>
                            </tr>
                        ) : (
                            contratistas.map((c) => (
                                <React.Fragment key={c.id}>
                                    <tr 
                                        className="row-expandable" 
                                        onClick={() => toggleRow(c.id)}
                                    >
                                        <td>
                                            {expandedRows.has(c.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </td>
                                        <td className="font-bold">{c.nombre}</td>
                                        <td>{c.rut}</td>
                                        <td>{c.totalContratos}</td>
                                        <td>
                                            <span className="contract-count-badge">
                                                {c.contratosFacturables}
                                            </span>
                                        </td>
                                    </tr>
                                    {expandedRows.has(c.id) && (
                                        <tr className="detail-row">
                                            <td colSpan="5">
                                                <div className="detail-content">
                                                    <h4><Info size={16} /> Desglose de Contratos Facturables</h4>
                                                    <div className="contracts-list">
                                                        {c.detalleContratos.map(v => (
                                                            <div key={v.id} className="contract-card">
                                                                <div className="contract-header">
                                                                    <span className="contract-id">Contrato: {v.numero_contrato}</span>
                                                                    <span className="contract-programa">{v.programa}</span>
                                                                </div>
                                                                <div className="contract-info-item">
                                                                    <span>Servicio:</span>
                                                                    <strong>{v.servicio}</strong>
                                                                </div>
                                                                <div className="contract-info-item">
                                                                    <span>Dependencia:</span>
                                                                    <strong>{v.dependencia}</strong>
                                                                </div>
                                                                <div className="contract-info-item" style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                                                                    <span>Registros encontrados:</span>
                                                                    <strong style={{ color: '#2563eb' }}>
                                                                        {v.periodosRegistros && v.periodosRegistros.length > 0 ? v.periodosRegistros.join(', ') : 'Sin registros'}
                                                                    </strong>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {c.detalleContratos.length === 0 && (
                                                            <p className="text-sm text-gray-500 italic">No hay contratos facturables para esta empresa.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

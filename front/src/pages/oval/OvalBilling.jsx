import { useState, useEffect } from 'react';
import api from '../../api';
import { 
    DollarSign, 
    Building2, 
    FileCheck, 
    ChevronDown, 
    ChevronUp, 
    Settings, 
    Save, 
    Info,
    RefreshCw,
    FileDown,
    FileText,
    Send
} from 'lucide-react';
import './OvalBilling.css';

export default function OvalBilling() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [montoConfig, setMontoConfig] = useState(1000);
    const [updatingConfig, setUpdatingConfig] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [email, setEmail] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reportes/oval/billing');
            setData(response.data.data);
            setMontoConfig(response.data.data.montoUnitario);
        } catch (err) {
            console.error('Error fetching billing data:', err);
            setError('Error al cargar el reporte de facturación');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateConfig = async () => {
        try {
            setUpdatingConfig(true);
            await api.post('/reportes/oval/config', { monto: montoConfig });
            await fetchData(); // Refresh data with new monto
            alert('Configuración actualizada correctamente');
        } catch (err) {
            console.error('Error updating config:', err);
            alert('Error al actualizar la configuración');
        } finally {
            setUpdatingConfig(false);
        }
    };

    const handleExportPdf = () => {
        window.open(`${api.defaults.baseURL}/reportes/oval/billing/pdf?token=${localStorage.getItem('token')}`, '_blank');
    };

    const handleExportExcel = () => {
        window.open(`${api.defaults.baseURL}/reportes/oval/billing/excel?token=${localStorage.getItem('token')}`, '_blank');
    };

    const handleSendEmail = async () => {
        if (!email) return alert('Por favor ingrese un email');
        try {
            setSendingEmail(true);
            const response = await api.post('/reportes/oval/billing/send', { email });
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

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading && !data) return <div className="loading">Cargando reporte de facturación...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const { resumen, contratistas } = data;

    return (
        <div className="oval-page">
            <header className="oval-header">
                <h1>Reporte de Facturación OVAL</h1>
                <p>Resumen de contratos facturables por empresa contratista.</p>
            </header>

            {/* Config Widget */}
            <div className="billing-config-card">
                <div className="config-info">
                    <h3><Settings size={20} className="text-indigo-500" /> Configuración de Facturación</h3>
                    <p>Defina el monto facturable por cada contrato con programa activo.</p>
                </div>
                <div className="config-actions">
                    <div className="config-input-wrapper">
                        <span className="currency-label">$</span>
                        <input 
                            type="number" 
                            className="config-input"
                            value={montoConfig}
                            onChange={(e) => setMontoConfig(e.target.value)}
                            min="0"
                            step="100"
                        />
                    </div>
                    <button 
                        className="btn-update-config" 
                        onClick={handleUpdateConfig}
                        disabled={updatingConfig || montoConfig === data.montoUnitario}
                    >
                        {updatingConfig ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        Actualizar
                    </button>
                </div>
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
                <div className="stat-card">
                    <div className="stat-icon green">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(resumen.montoGranTotal)}</span>
                        <span className="stat-label">Total Facturable</span>
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
                            <th>Monto Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contratistas.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-gray-500 italic">No se encontraron datos de facturación</td>
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
                                        <td className="monto-cell">{formatCurrency(c.montoTotal)}</td>
                                    </tr>
                                    {expandedRows.has(c.id) && (
                                        <tr className="detail-row">
                                            <td colSpan="6">
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
                                                            </div>
                                                        ))}
                                                        {c.detalleContratos.length === 0 && (
                                                            <p className="text-sm text-gray-500 italic">No hay contratos con programa activo para esta empresa.</p>
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

// Helper to use React in this file (standard in many setups, but just in case)
import React from 'react';

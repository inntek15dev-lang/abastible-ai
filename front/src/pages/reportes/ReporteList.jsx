// IEEE Trace: REQ-008 | US-008, Sprint 5 | pages/reportes/ReporteList.jsx
import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, ExternalLink, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import './Reportes.css';

export default function ReporteList() {
    const { canRead } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [periodoDesde, setPeriodoDesde] = useState(new Date().toISOString().slice(0, 7));
    const [periodoHasta, setPeriodoHasta] = useState(new Date().toISOString().slice(0, 7));
    const [reportData, setReportData] = useState({ elementos: [], registros: [] });

    useEffect(() => {
        if (!canRead('Reportes')) {
            navigate('/');
            return;
        }
        fetchData();
    }, [canRead, navigate, periodoDesde, periodoHasta]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/reportes/cumplimiento?periodo_desde=${periodoDesde}&periodo_hasta=${periodoHasta}`);
            if (response.data.success) {
                setReportData(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        window.open(`${api.defaults.baseURL}/reportes/cumplimiento/pdf?periodo_desde=${periodoDesde}&periodo_hasta=${periodoHasta}&token=${localStorage.getItem('token')}`, '_blank');
    };

    const handleExportExcel = async () => {
        window.open(`${api.defaults.baseURL}/reportes/cumplimiento/excel?periodo_desde=${periodoDesde}&periodo_hasta=${periodoHasta}&token=${localStorage.getItem('token')}`, '_blank');
    };

    const handleDesdeChange = (val) => {
        setPeriodoDesde(val);
        setPeriodoHasta(val); // Automatic replication
    };

    const viewRegistroPdf = (id) => {
        window.open(`${api.defaults.baseURL}/reportes/registro/${id}/pdf?token=${localStorage.getItem('token')}`, '_blank');
    };

    const getScoreColor = (score) => {
        if (score >= 85) return '#10b981'; // Emerald
        if (score >= 70) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    return (
        <div className="report-center-wrapper">
            {/* Header Section */}
            <div className="report-center-header">
                <div className="header-info">
                    <div className="header-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1>Dashboard de Reportes</h1>
                        <p>Consolidado de cumplimiento y gestión de registros</p>
                    </div>
                </div>

                <div className="header-controls">
                    <div className="period-picker-group" style={{ display: 'flex', gap: '12px' }}>
                        <div className="period-picker">
                            <label>Desde:</label>
                            <input
                                type="month"
                                value={periodoDesde}
                                onChange={(e) => handleDesdeChange(e.target.value)}
                            />
                        </div>
                        <div className="period-picker">
                            <label>Hasta:</label>
                            <input
                                type="month"
                                value={periodoHasta}
                                onChange={(e) => setPeriodoHasta(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="header-actions">
                        <button onClick={handleExportExcel} className="btn-export excel">
                            <FileSpreadsheet size={18} />
                            <span>Excel</span>
                        </button>
                        <button onClick={handleExportPdf} className="btn-export pdf">
                            <FileText size={18} />
                            <span>PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="report-loading">
                    <div className="spinner"></div>
                    <p>Calculando matrices de cumplimiento...</p>
                </div>
            ) : (
                <div className="report-content-grid">
                    {/* Element Summary Section */}
                    <div className="report-card element-summary">
                        <h3>Cumplimiento por Elemento</h3>
                        <div className="element-grid">
                            {reportData.elementos.length > 0 ? (
                                reportData.elementos.map(item => (
                                    <div key={item.id} className="element-score-card">
                                        <div className="element-label">{item.name}</div>
                                        <div className="score-viz">
                                            <div className="progress-bar-bg">
                                                <div 
                                                    className="progress-bar-fill" 
                                                    style={{ width: `${item.declarado}%`, backgroundColor: getScoreColor(item.declarado) }}
                                                ></div>
                                            </div>
                                            <div className="score-labels">
                                                <span className="score-val" style={{ color: getScoreColor(item.declarado) }}>
                                                    {item.declarado}%
                                                </span>
                                                {item.auditado !== null && (
                                                    <span className="audit-val">
                                                        Auditor: {item.auditado}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-data-msg">No hay datos para este periodo</div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Log Table */}
                    <div className="report-card registro-log">
                        <h3>Registros del Periodo</h3>
                        <div className="table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Empresa (EECC)</th>
                                        <th>Cumplimiento</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.registros.length > 0 ? (
                                        reportData.registros.map(reg => (
                                            <tr key={reg.id}>
                                                <td className="eecc-cell">
                                                    <strong>{reg.eecc}</strong>
                                                </td>
                                                <td className="score-cell">
                                                    <span className="badge-score" style={{ backgroundColor: getScoreColor(reg.cumplimiento) + '20', color: getScoreColor(reg.cumplimiento) }}>
                                                        {reg.cumplimiento}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={`status-pill ${reg.statusClass}`}>
                                                        {reg.cumplimiento >= 85 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                        {reg.estado}
                                                    </div>
                                                </td>
                                                <td className="actions-cell">
                                                    <button onClick={() => viewRegistroPdf(reg.id)} title="Ver PDF Detallado">
                                                        <ExternalLink size={16} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="empty-table">Sin registros encontrados</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

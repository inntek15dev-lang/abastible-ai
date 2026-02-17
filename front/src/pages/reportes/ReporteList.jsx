// IEEE Trace: REQ-008 | US-008, Sprint 4 | pages/reportes/ReporteList.jsx
import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Reportes.css';

export default function ReporteList() {
    const { canRead } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!canRead('Reportes')) {
            navigate('/');
        }
    }, [canRead, navigate]);

    const [complianceData, setComplianceData] = useState([]);
    const [recordsData, setRecordsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterPeriodo, setFilterPeriodo] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        if (!canRead('Reportes')) {
            navigate('/');
            return;
        }
        fetchData();
    }, [canRead, navigate, filterPeriodo]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:4000/api/reportes/cumplimiento?periodo=${filterPeriodo}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token storage
                }
            });
            const data = await response.json();

            if (data.success) {
                setComplianceData(data.data.elementos.map(e => ({
                    ...e,
                    status: getValueColorClass(e.value) // Map status for color
                })));
                setRecordsData(data.data.registros);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };


    const getBarColorClass = (val) => {
        if (val === 100) return 'green';
        if (val === 0) return 'red';
        return 'yellow';
    };

    const getValueColorClass = (val) => {
        if (val === 100) return 'high';
        if (val === 0) return 'mid-high';
        return 'mid-high';
    };

    return (
        <div className="report-page-container">
            {/* Header */}
            <div className="report-header">
                <div className="report-title">
                    <FileText size={24} color="#6c757d" />
                    Reportes
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="month"
                        id="filter-periodo-report"
                        value={filterPeriodo}
                        onChange={(e) => setFilterPeriodo(e.target.value)}
                        className="form-control"
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                    <div className="report-actions">
                        <button id="btn-export-excel" className="btn-export excel">
                            <FileSpreadsheet size={18} />
                            Exportar Excel
                        </button>
                        <button id="btn-export-pdf" className="btn-export pdf">
                            <FileText size={18} />
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 20, textAlign: 'center' }}>Cargando datos...</div>
            ) : (
                <>
                    {/* Cumplimiento por Elemento */}
                    <div id="report-card-compliance" className="report-card">
                        <h3 className="card-title">Cumplimiento por Elemento</h3>
                        {complianceData.length === 0 ? (
                            <p style={{ color: '#888', fontStyle: 'italic' }}>No hay datos de actividades para este periodo.</p>
                        ) : (
                            <div className="compliance-list">
                                {complianceData.map((item, index) => (
                                    <div key={index} className="compliance-item">
                                        <div className="compliance-header">
                                            <span>{item.name}</span>
                                            <span className={`compliance-value ${getValueColorClass(item.value)}`}>
                                                {item.value}%
                                            </span>
                                        </div>
                                        <div className="progress-track">
                                            <div
                                                className={`progress-fill ${getBarColorClass(item.value)}`}
                                                style={{ width: `${item.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resumen de Registros */}
                    <div className="report-card">
                        <h3 className="card-title">Resumen de Registros</h3>
                        <div className="summary-table-container">
                            <table className="summary-table">
                                <thead>
                                    <tr>
                                        <th>PERIODO</th>
                                        <th>EECC</th>
                                        <th>CUMPLIMIENTO</th>
                                        <th>ESTADO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recordsData.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No se encontraron registros.</td></tr>
                                    ) : (
                                        recordsData.map((record, index) => (
                                            <tr key={index}>
                                                <td>{record.periodo}</td>
                                                <td>{record.eecc}</td>
                                                <td>
                                                    <span className={`badge-compliance ${record.cumplimiento >= 85 ? 'high' : 'low'}`}>
                                                        {record.cumplimiento.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-text ${record.statusClass}`}>
                                                        {record.statusClass === 'ok' ? '✓' : 'X'} {record.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

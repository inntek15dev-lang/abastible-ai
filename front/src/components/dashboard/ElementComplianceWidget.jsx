import { useState, useEffect } from 'react';
import api from '../../api'; // Adjust path if needed, assuming components/dashboard/Widget
import './ElementComplianceWidget.css';

export default function ElementComplianceWidget({ period }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Using existing endpoint logic. Note: API path was localhost:4000 in ReporteList, 
            // but we should use the configured 'api' instance which likely has the base URL.
            // If ReporteList was hardcoded, I should fix that too, but here I'll use 'api'.
            // However, ReporteList used `fetch`. I'll use `api.get`.
            // The endpoint in ReporteList was `/api/reportes/cumplimiento`.
            // 'api' instance usually prepends /api or base URL. 
            // Let's assume api.get('/reportes/cumplimiento') is correct based on other files.

            const queryPeriod = period || new Date().toISOString().slice(0, 7);
            const response = await api.get(`/reportes/cumplimiento?periodo=${queryPeriod}`);

            if (response.data.success) {
                setData(response.data.data.elementos.map(e => ({
                    ...e,
                    declaradoColor: getBarColorClass(e.declarado),
                    auditadoColor: e.auditado !== null ? getBarColorClass(e.auditado) : 'gray'
                })));
            }
        } catch (error) {
            console.error("Error loading compliance widget:", error);
        } finally {
            setLoading(false);
        }
    };

    const getBarColorClass = (val) => {
        if (val === null) return 'gray';
        if (val >= 85) return 'green';
        if (val < 70) return 'red';
        return 'yellow';
    };

    if (loading) return <div className="p-4 text-center text-gray-400">Cargando cumplimiento...</div>;

    return (
        <div className="compliance-widget">
            <h3 className="widget-title">Cumplimiento por Elemento</h3>

            {/* Legend */}
            <div className="compliance-legend">
                <div className="legend-item">
                    <span className="legend-box declarado"></span>
                    <span>Declarado</span>
                </div>
                <div className="legend-item">
                    <span className="legend-box auditado"></span>
                    <span>Auditado</span>
                </div>
            </div>

            {data.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay datos para el periodo seleccionado.</p>
            ) : (
                <div className="compliance-list">
                    {data.map((item, index) => (
                        <div key={index} className="compliance-item">
                            <div className="compliance-header">
                                <span className="item-name">{item.name}</span>
                            </div>

                            {/* Declarado Row */}
                            <div className="bar-container">
                                <div className="progress-track small">
                                    <div
                                        className={`progress-fill ${item.declaradoColor}`}
                                        style={{ width: `${item.declarado}%` }}
                                    />
                                </div>
                                <span className="bar-value">{item.declarado}%</span>
                            </div>

                            {/* Auditado Row */}
                            <div className="bar-container">
                                <div className="progress-track small audit-track">
                                    {item.auditado !== null ? (
                                        <div
                                            className={`progress-fill ${item.auditadoColor}`}
                                            style={{ width: `${item.auditado}%` }}
                                        />
                                    ) : (
                                        <div className="no-data-bar">Pendiente</div>
                                    )}
                                </div>
                                <span className="bar-value">
                                    {item.auditado !== null ? `${item.auditado}%` : '-'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

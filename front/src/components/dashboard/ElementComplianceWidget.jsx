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
                    statusColor: getValueColorClass(e.value),
                    barColor: getBarColorClass(e.value)
                })));
            }
        } catch (error) {
            console.error("Error loading compliance widget:", error);
        } finally {
            setLoading(false);
        }
    };

    const getBarColorClass = (val) => {
        if (val >= 85) return 'green';
        if (val < 70) return 'red';
        return 'yellow';
    };

    const getValueColorClass = (val) => {
        if (val >= 85) return 'high';
        if (val < 70) return 'low';
        return 'mid';
    };

    if (loading) return <div className="p-4 text-center text-gray-400">Cargando cumplimiento...</div>;

    return (
        <div className="compliance-widget">
            <h3 className="widget-title">Cumplimiento por Elemento</h3>
            {data.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay datos para el periodo seleccionado.</p>
            ) : (
                <div className="compliance-list">
                    {data.map((item, index) => (
                        <div key={index} className="compliance-item">
                            <div className="compliance-header">
                                <span>{item.name}</span>
                                <span className={`compliance-value ${item.statusColor}`}>
                                    {item.value}%
                                </span>
                            </div>
                            <div className="progress-track">
                                <div
                                    className={`progress-fill ${item.barColor}`}
                                    style={{ width: `${item.value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

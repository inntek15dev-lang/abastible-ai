import { useState, useEffect } from 'react';
import api from '../../api'; // Adjust path if needed, assuming components/dashboard/Widget
import './ElementComplianceWidget.css';

export default function ElementComplianceWidget({ filters }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();
            if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
            
            // Period is historically fecha_fin or current month
            const queryPeriod = filters.fecha_fin || new Date().toISOString().slice(0, 7);
            params.append('periodo', queryPeriod);

            if (filters.programa_id && filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.servicio_id && filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id && filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
            if (filters.gerencia_id && filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
            if (filters.subgerencia_id && filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
            if (filters.adc_id && filters.adc_id !== 'todos') params.append('adc_id', filters.adc_id);

            const response = await api.get(`/reportes/cumplimiento?${params.toString()}`);

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

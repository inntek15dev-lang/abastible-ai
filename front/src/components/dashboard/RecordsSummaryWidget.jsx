import { useState, useEffect } from 'react';
import api from '../../api';
import './RecordsSummaryWidget.css';

export default function RecordsSummaryWidget({ filters }) {
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
                setData(response.data.data.registros);
            }
        } catch (error) {
            console.error("Error loading records summary widget:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-400">Cargando registros...</div>;

    return (
        <div className="records-widget">
            <h3 className="widget-title">Resumen de Registros</h3>
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
                        {data.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>No se encontraron registros.</td></tr>
                        ) : (
                            data.map((record, index) => (
                                <tr key={index}>
                                    <td>{record.periodo}</td>
                                    <td>{record.eecc}</td>
                                    <td>
                                        <span className={`badge-compliance ${record.cumplimiento >= 85 ? 'high' : 'low'}`}>
                                            {Number(record.cumplimiento).toFixed(1)}%
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
    );
}

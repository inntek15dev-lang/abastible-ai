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
            if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);

            if (filters.programa_id && filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.servicio_id && filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id && filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
            if (filters.gerencia_id && filters.gerencia_id !== 'todas') params.append('gerencia_id', filters.gerencia_id);
            if (filters.subgerencia_id && filters.subgerencia_id !== 'todas') params.append('subgerencia_id', filters.subgerencia_id);
            if (filters.adc_id && filters.adc_id !== 'todos') params.append('adc_id', filters.adc_id);
            if (filters.search) params.append('search', filters.search);
            if (filters.solo_huerfanos) params.append('solo_huerfanos', 'true');

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
                            <th>Nº CONTRATO / SERVICIO / DEPENDENCIA</th>
                            <th>CUMPLIMIENTO</th>
                            <th>ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>No se encontraron registros.</td></tr>
                        ) : (
                            data.map((record, index) => {
                                const numContrato = record.numero_contrato;
                                const contratoLabel = numContrato 
                                    ? (String(numContrato).toLowerCase().startsWith('contrato') ? numContrato : `Contrato N° ${numContrato}`)
                                    : (record.servicio || 'Sin Contrato');
                                const subInfo = [record.servicio, record.dependencia].filter(Boolean).join(' • ');

                                return (
                                    <tr key={index}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{record.periodo}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#111827' }}>{record.eecc}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                                                {contratoLabel}
                                            </div>
                                            {subInfo && (
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                                    {subInfo}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className={`badge-compliance ${record.cumplimiento >= 85 ? 'high' : 'low'}`}>
                                                {Number(record.cumplimiento).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className={`status-text ${record.statusClass}`}>
                                                {record.statusClass === 'ok' ? '✓' : 'X'} {record.estado}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

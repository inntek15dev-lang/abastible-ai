import { useState, useEffect } from 'react';
import api from '../../api';
import './RecordsSummaryWidget.css';

export default function RecordsSummaryWidget({ period }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const queryPeriod = period || new Date().toISOString().slice(0, 7);
            const response = await api.get(`/reportes/cumplimiento?periodo=${queryPeriod}`);

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

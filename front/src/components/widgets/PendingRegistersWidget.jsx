import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, PlusCircle, ArrowRight } from 'lucide-react';
import api from '../../api';

export default function PendingRegistersWidget({ vinculacion }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!vinculacion) return;
            try {
                setLoading(true);
                // Fetch full history for this contractor to check for gaps
                const res = await api.get('/registros');
                setHistory(res.data.data || []);
            } catch (err) {
                console.error("Error fetching history for widget", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [vinculacion]);

    const pendingPeriods = useMemo(() => {
        if (!vinculacion || !vinculacion.fecha_inicio_contrato) return [];

        const start = new Date(vinculacion.fecha_inicio_contrato);
        const end = new Date(); // Today
        const periods = [];

        // Normalize start date to first day of month to avoid issues
        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const periodStr = `${year}-${month}`;

            // Check if register exists for this period AND this specific vinculacion
            const exists = history.some(r => 
                r.periodo && 
                r.periodo.startsWith(periodStr) && 
                r.vinculacion_id === vinculacion.id
            );

            if (!exists) {
                periods.push({
                    periodo: periodStr,
                    date: new Date(current), // Clone
                    vinculacionId: vinculacion.id
                });
            }

            // Next month
            current.setMonth(current.getMonth() + 1);
        }

        // Return oldest first to catch up
        return periods.sort((a, b) => a.date - b.date);
    }, [vinculacion, history]);

    if (!vinculacion || (loading && history.length === 0)) return null;
    if (pendingPeriods.length === 0) return null;

    return (
        <div className="pending-registers-widget" style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <div style={{
                background: '#fff7ed', // Orange tint for "Action Required"
                padding: '12px 16px',
                borderBottom: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <AlertCircle size={20} color="#c2410c" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#9a3412', fontWeight: 600 }}>
                    Registros Pendientes de Creación
                </h3>
                <span style={{
                    background: '#c2410c', color: 'white',
                    borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600
                }}>
                    {pendingPeriods.length}
                </span>
            </div>

            <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '16px' }}>
                    Se han detectado periodos mensuales sin registro desde el inicio de su contrato ({new Date(vinculacion.fecha_inicio_contrato).toLocaleDateString('es-CL')}).
                </p>

                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.9rem' }}>
                        <thead>
                            <tr>
                                <th>Periodo</th>
                                <th>Contrato / Vinculación</th>
                                <th style={{ textAlign: 'right' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingPeriods.map((item) => (
                                <tr key={item.periodo}>
                                    <td style={{ fontWeight: 600, color: '#c2410c' }}>
                                        {item.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500 }}>{vinculacion.servicio?.nombre}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                {vinculacion.dependencia?.nombre}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Link
                                            to={`/registros/new?periodo=${item.periodo}&vinculacion_id=${vinculacion.id}`}
                                            className="btn-primary"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                padding: '4px 12px', fontSize: '0.8rem'
                                            }}
                                        >
                                            <PlusCircle size={14} /> Crear Registro
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

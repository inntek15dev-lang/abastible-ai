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
        const now = new Date();
        // Tope explícito: último instante del mes en curso para garantizar su inclusión
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const periods = [];

        // Normalize start date to first day of month to avoid issues
        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const periodStr = `${year}-${month}`;
            const isCurrentMonth = year === now.getFullYear() && current.getMonth() === now.getMonth();

            // Check if register exists for this period AND this specific vinculacion
            const existingRecord = history.find(r => 
                r.periodo && 
                r.periodo.startsWith(periodStr) && 
                (r.vinculacion_id === vinculacion.id || r.contratista_asignacion_id === vinculacion.id)
            );

            if (!existingRecord) {
                periods.push({
                    periodo: periodStr,
                    date: new Date(current),
                    vinculacionId: vinculacion.id,
                    action: 'create',
                    isCurrentMonth
                });
            } else if (existingRecord.cerrado === 0 || existingRecord.cerrado === false) {
                periods.push({
                    periodo: periodStr,
                    date: new Date(current),
                    vinculacionId: vinculacion.id,
                    action: 'complete',
                    recordId: existingRecord.id,
                    isCurrentMonth
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
                                <tr key={item.periodo} style={{ backgroundColor: item.isCurrentMonth ? '#f0fdfa' : 'transparent' }}>
                                    <td style={{ fontWeight: 600, color: item.isCurrentMonth ? '#0d9488' : (item.action === 'create' ? '#c2410c' : '#2563eb') }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{item.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}</span>
                                            {item.isCurrentMonth && (
                                                <span style={{
                                                    backgroundColor: '#0d9488', color: 'white',
                                                    borderRadius: '10px', padding: '2px 8px',
                                                    fontSize: '0.65rem', fontWeight: 700,
                                                    letterSpacing: '0.5px', whiteSpace: 'nowrap'
                                                }}>MES ACTUAL</span>
                                            )}
                                        </div>
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
                                        {item.action === 'complete' ? (
                                            <Link
                                                to={`/registros/${item.recordId}/edit`}
                                                className="btn-primary"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '4px 12px', fontSize: '0.8rem',
                                                    backgroundColor: '#2563eb', borderColor: '#2563eb'
                                                }}
                                            >
                                                <ArrowRight size={14} /> Completar Registro
                                            </Link>
                                        ) : (
                                            <Link
                                                to={`/registros/new?periodo=${item.periodo}&vinculacion_id=${vinculacion.id}`}
                                                className="btn-primary"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '4px 12px', fontSize: '0.8rem',
                                                    backgroundColor: item.isCurrentMonth ? '#0d9488' : undefined,
                                                    borderColor: item.isCurrentMonth ? '#0d9488' : undefined
                                                }}
                                            >
                                                <PlusCircle size={14} /> Crear Registro
                                            </Link>
                                        )}
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

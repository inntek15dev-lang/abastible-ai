import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function ComplianceMatrixReport() {
    const [data, setData] = useState({ columns: [], rows: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        try {
            const response = await api.get('/dashboard/matrix');
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching matrix:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            Cargando matriz de cumplimiento...
        </div>
    );
    if (!data.rows.length) return (
        <div style={{
            textAlign: 'center', padding: '2.5rem', color: '#9ca3af',
            background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb'
        }}>
            No hay datos de vinculaciones para mostrar
        </div>
    );

    const thStyle = {
        padding: '10px 12px', fontWeight: 600, fontSize: '11px',
        textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.3px',
        borderBottom: '2px solid #e5e7eb', background: '#f9fafb',
        whiteSpace: 'nowrap'
    };

    const tdStyle = {
        padding: '10px 12px', fontSize: '12px', color: '#374151',
        borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle'
    };

    const cellBorder = { borderLeft: '1px solid #f3f4f6' };

    const getCellBg = (declarado) => {
        const val = parseFloat(declarado);
        if (val >= 85) return '#f0fdf4';     // green-50
        if (val >= 70) return '#fefce8';     // yellow-50
        return '#fef2f2';                     // red-50
    };

    return (
        <div style={{
            background: '#fff', borderRadius: '8px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
            marginTop: '2rem'
        }}>
            <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 600 }}>
                    Matriz de Cumplimiento por Vinculación
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {data.rows.length} vinculaciones · {data.columns.length} periodos
                </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%', borderCollapse: 'collapse',
                    fontSize: '12px', textAlign: 'left'
                }}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, textAlign: 'center', width: '40px' }}>#</th>
                            <th style={thStyle}>Contratista</th>
                            <th style={{ ...thStyle, width: '110px' }}>RUT</th>
                            <th style={thStyle}>Programa</th>
                            <th style={thStyle}>Servicio</th>
                            <th style={thStyle}>Dependencia</th>
                            {data.columns.map((col, idx) => (
                                <th key={col.key} style={{
                                    ...thStyle, textAlign: 'center', ...cellBorder,
                                    minWidth: '130px',
                                    background: idx === data.columns.length - 1 ? '#fffbeb' : '#f9fafb'
                                }}>
                                    <div style={{ fontSize: '10px', opacity: 0.7, lineHeight: 1.2 }}>
                                        {col.label}
                                    </div>
                                    <div style={{ fontSize: '9px', fontWeight: 400, color: '#9ca3af', marginTop: '2px' }}>
                                        DECLARADO | AUDITADO
                                    </div>
                                </th>
                            ))}
                            <th style={{ ...thStyle, textAlign: 'center', ...cellBorder, width: '44px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, index) => (
                            <tr
                                key={row.id}
                                style={{ transition: 'background 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>
                                    {index + 1}
                                </td>
                                <td style={{ ...tdStyle, fontWeight: 600, color: '#1d4ed8' }}>
                                    <Link to={`/contratistas`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                                        {row.contratista}
                                    </Link>
                                </td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#6b7280', fontSize: '11px' }}>
                                    {row.rut}
                                </td>
                                <td style={{
                                    ...tdStyle, color: '#1d4ed8', fontWeight: 500,
                                    fontSize: '11px', maxWidth: '150px', lineHeight: 1.3
                                }}>
                                    {row.programa}
                                </td>
                                <td style={{ ...tdStyle, color: '#6b7280' }}>{row.servicio}</td>
                                <td style={{ ...tdStyle, color: '#6b7280' }}>{row.dependencia}</td>

                                {data.columns.map((col, idx) => {
                                    const cell = row.data[col.key];
                                    const isLast = idx === data.columns.length - 1;

                                    return (
                                        <td key={col.key} style={{
                                            ...tdStyle, textAlign: 'center', ...cellBorder,
                                            background: cell ? (isLast ? '#fffbeb' : getCellBg(cell.declarado)) : 'transparent',
                                            padding: '6px 8px'
                                        }}>
                                            {cell ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <div style={{ fontWeight: 600, color: '#374151', fontSize: '12px' }}>
                                                        {cell.declarado}%
                                                        {cell.auditado && (
                                                            <span style={{ color: '#9ca3af', fontWeight: 400 }}> | {cell.auditado}%</span>
                                                        )}
                                                    </div>

                                                </div>
                                            ) : (
                                                <span style={{ color: '#d1d5db' }}>-</span>
                                            )}
                                        </td>
                                    );
                                })}

                                <td style={{ ...tdStyle, textAlign: 'center', ...cellBorder }}>
                                    <Link to={`/contratistas`} style={{ color: '#9ca3af' }} title="Ver detalle">
                                        <MessageSquare size={16} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

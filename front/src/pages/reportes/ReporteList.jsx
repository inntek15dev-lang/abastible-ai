// IEEE Trace: REQ-008 | US-008, Sprint 4 | pages/reportes/ReporteList.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
    FileText, Download, Calendar, Building, TrendingUp,
    BarChart2, PieChart, Users, CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReporteList() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { canRead } = useAuth();

    // Filters
    const [filters, setFilters] = useState({
        periodo: new Date().toISOString().slice(0, 7),
        contratista_id: ''
    });

    useEffect(() => {
        fetchDashboardData();
    }, [filters.periodo]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [kpisRes, cumplimientoRes] = await Promise.all([
                api.get('/dashboard/kpis'),
                api.get('/dashboard/cumplimiento')
            ]);
            setDashboardData({
                kpis: kpisRes.data.data,
                cumplimiento: cumplimientoRes.data.data
            });
        } catch (err) {
            setError('Error al cargar datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    const generateCumplimientoPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text('Reporte de Cumplimiento General', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 14, 28);
        doc.text(`Periodo: ${filters.periodo}`, 14, 34);

        // KPIs Summary
        if (dashboardData?.kpis) {
            doc.setFontSize(12);
            doc.text('Resumen de KPIs', 14, 48);

            doc.autoTable({
                head: [['Indicador', 'Valor']],
                body: [
                    ['Total Registros', dashboardData.kpis.totalRegistros || 0],
                    ['Pendientes', dashboardData.kpis.pendientes || 0],
                    ['Auditados', dashboardData.kpis.auditados || 0],
                    ['% Cumplimiento Promedio', `${dashboardData.kpis.promedioCumplimiento || 0}%`],
                ],
                startY: 52,
                theme: 'grid'
            });
        }

        // Cumplimiento por Contratista
        if (dashboardData?.cumplimiento?.length) {
            const tableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 100;
            doc.setFontSize(12);
            doc.text('Cumplimiento por Contratista', 14, tableY);

            doc.autoTable({
                head: [['Contratista', 'Registros', '% Cumplimiento']],
                body: dashboardData.cumplimiento.map(c => [
                    c.eecc_nombre || c.nombre || '-',
                    c.total_registros || 0,
                    `${c.promedio_cumplimiento || 0}%`
                ]),
                startY: tableY + 4,
                theme: 'striped'
            });
        }

        doc.save(`reporte_cumplimiento_${filters.periodo}.pdf`);
    };

    const generateCumplimientoExcel = () => {
        // Create Data for Excel
        const wb = XLSX.utils.book_new();

        // Sheet 1: KPIs
        const kpiData = [
            ['Indicador', 'Valor'],
            ['Total Registros', dashboardData?.kpis?.totalRegistros || 0],
            ['Pendientes', dashboardData?.kpis?.pendientes || 0],
            ['Auditados', dashboardData?.kpis?.auditados || 0],
            ['% Cumplimiento Promedio', `${dashboardData?.kpis?.promedioCumplimiento || 0}%`]
        ];
        const wsKPI = XLSX.utils.aoa_to_sheet([['Resumen de KPIs'], [], ...kpiData]);
        XLSX.utils.book_append_sheet(wb, wsKPI, "KPIs");

        // Sheet 2: Detalle Contratistas
        if (dashboardData?.cumplimiento?.length) {
            const cumplimientoData = dashboardData.cumplimiento.map(c => ({
                Contratista: c.eecc_nombre || c.nombre || '-',
                Registros: c.total_registros || 0,
                Cumplimiento: `${c.promedio_cumplimiento || 0}%`,
                Tendencia: (Number(c.promedio_cumplimiento) || 0) >= 85 ? 'Positiva' : 'Negativa'
            }));
            const wsDetalle = XLSX.utils.json_to_sheet(cumplimientoData);
            XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Contratistas");
        }

        // Save
        XLSX.writeFile(wb, `reporte_cumplimiento_${filters.periodo}.xlsx`);
    };

    if (loading) return <div className="loading">Cargando reportes...</div>;

    const kpis = dashboardData?.kpis || {};
    const cumplimiento = dashboardData?.cumplimiento || [];

    return (
        <div className="page-container">
            <header className="page-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <h1 style={{ color: 'var(--color-brand-secondary)' }}>
                            <FileText size={28} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Reportes y KPIs
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Indicadores de gestión y generación de reportes consolidados.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={generateCumplimientoExcel}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <FileText size={18} />
                            Exportar Excel
                        </button>
                        <button
                            onClick={generateCumplimientoPDF}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <Download size={18} />
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </header>

            {/* Period Filter */}
            <div className="filters-bar" style={{
                background: 'white', padding: '16px', borderRadius: '8px',
                border: '1px solid var(--border-color)', marginBottom: '20px',
                display: 'flex', gap: '16px', alignItems: 'end'
            }}>
                <div className="form-group" style={{ width: '200px' }}>
                    <label><Calendar size={14} style={{ marginRight: 4 }} /> Periodo</label>
                    <input
                        type="month"
                        className="form-control"
                        value={filters.periodo}
                        onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
                    />
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div className="kpi-card" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px', borderRadius: '12px', color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{kpis.totalRegistros || 0}</div>
                            <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>Total Registros</div>
                        </div>
                        <BarChart2 size={32} style={{ opacity: 0.6 }} />
                    </div>
                </div>

                <div className="kpi-card" style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    padding: '24px', borderRadius: '12px', color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{kpis.pendientes || 0}</div>
                            <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>Pendientes</div>
                        </div>
                        <PieChart size={32} style={{ opacity: 0.6 }} />
                    </div>
                </div>

                <div className="kpi-card" style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    padding: '24px', borderRadius: '12px', color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{kpis.auditados || 0}</div>
                            <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>Auditados</div>
                        </div>
                        <CheckCircle size={32} style={{ opacity: 0.6 }} />
                    </div>
                </div>

                <div className="kpi-card" style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    padding: '24px', borderRadius: '12px', color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{kpis.promedioCumplimiento || 0}%</div>
                            <div style={{ opacity: 0.9, fontSize: '0.9rem' }}>Cumplimiento Promedio</div>
                        </div>
                        <TrendingUp size={32} style={{ opacity: 0.6 }} />
                    </div>
                </div>
            </div>

            {/* Cumplimiento Table */}
            <div style={{
                background: 'white', padding: '24px', borderRadius: '12px',
                border: '1px solid var(--border-color)'
            }}>
                <h3 style={{ marginBottom: '16px', color: 'var(--color-brand-secondary)' }}>
                    <Users size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Cumplimiento por Contratista
                </h3>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Contratista</th>
                                <th>Total Registros</th>
                                <th>Auditados</th>
                                <th>% Cumplimiento</th>
                                <th>Tendencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cumplimiento.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="empty-row">No hay datos de cumplimiento para este periodo.</td>
                                </tr>
                            ) : (
                                cumplimiento.map((c, idx) => {
                                    const pct = Number(c.promedio_cumplimiento) || 0;
                                    const pctColor = pct < 70 ? 'var(--danger)' : pct < 90 ? 'var(--warning)' : 'var(--success)';

                                    return (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 500 }}>{c.eecc_nombre || c.nombre || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{c.total_registros || 0}</td>
                                            <td style={{ textAlign: 'center' }}>{c.auditados || 0}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: '100px', height: '8px', background: '#e0e0e0',
                                                        borderRadius: '4px', overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            width: `${pct}%`, height: '100%',
                                                            background: pctColor, borderRadius: '4px'
                                                        }} />
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: pctColor }}>{pct}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    color: pct >= 85 ? 'var(--success)' : 'var(--danger)',
                                                    fontSize: '1.2rem'
                                                }}>
                                                    {pct >= 85 ? '↑' : '↓'}
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
        </div>
    );
}

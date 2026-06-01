import { useState, useEffect, Fragment } from 'react';
import { Monitor, MapPin, Briefcase, FileText, Filter, ChevronDown, Search, XCircle, FileSpreadsheet, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/common/SearchableSelect';

export default function ComplianceMatrixReport() {
    const { user } = useAuth();
    const [data, setData] = useState({ columns: [], rows: [] });
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 5, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // Filters State
    const [filters, setFilters] = useState({
        contratista_id: 'todos',
        servicio_id: 'todos',
        dependencia_id: 'todas',
        programa_id: 'todos',
        tiene_registros: 'todos',
        periodo_desde: new Date().toISOString().slice(0, 7),
        periodo_hasta: new Date().toISOString().slice(0, 7),
        adc_id: 'todos'
    });

    // Options for filters
    const [options, setOptions] = useState({
        contratistas: [],
        servicios: [],
        dependencias: [],
        programas: [],
        admins: []
    });

    // Initial load of options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [cRes, sRes, dRes, pRes, aRes] = await Promise.all([
                    api.get('/contratistas'),
                    api.get('/servicios'),
                    api.get('/dependencias'),
                    api.get('/programas'),
                    api.get('/usuarios?role=administrador_contrato&active=true')
                ]);

                setOptions({
                    contratistas: cRes.data.success ? cRes.data.data : [],
                    servicios: sRes.data.success ? sRes.data.data : [],
                    dependencias: dRes.data.success ? dRes.data.data : [],
                    programas: pRes.data.success ? pRes.data.data : [],
                    admins: aRes.data.success ? aRes.data.data : []
                });
            } catch (error) {
                console.error("Error fetching filter options:", error);
            }
        };
        fetchOptions();
    }, []);

    // Handle user role scope once user is loaded
    useEffect(() => {
        if (user) {
            setFilters(prev => ({
                ...prev,
                contratista_id: ['contratista_admin', 'contratista_user'].includes(user.role) ? (user.contratista_id || 'todos') : 'todos',
                servicio_id: user.role === 'contratista_user' ? (user.tipo_contratista_id || 'todos') : 'todos',
                dependencia_id: user.role === 'contratista_user' ? (user.dependencia_id || 'todas') : 'todas'
            }));
        }
    }, [user]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [filters]);

    const handleClearFilters = () => {
        setFilters({
            contratista_id: ['contratista_admin', 'contratista_user'].includes(user?.role) ? (user.contratista_id || 'todos') : 'todos',
            servicio_id: user?.role === 'contratista_user' ? (user.tipo_contratista_id || 'todos') : 'todos',
            dependencia_id: user?.role === 'contratista_user' ? (user.dependencia_id || 'todas') : 'todas',
            programa_id: 'todos',
            tiene_registros: 'todos',
            periodo_desde: new Date().toISOString().slice(0, 7),
            periodo_hasta: new Date().toISOString().slice(0, 7),
            adc_id: 'todos'
        });
        setPage(1);
    };

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.contratista_id !== 'todos') params.append('contratista_id', filters.contratista_id);
            if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
            if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
            if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
            if (filters.tiene_registros !== 'todos') params.append('tiene_registros', filters.tiene_registros);
            if (filters.periodo_desde) params.append('periodo_desde', filters.periodo_desde);
            if (filters.periodo_hasta) params.append('periodo_hasta', filters.periodo_hasta);
            if (filters.adc_id && filters.adc_id !== 'todos') params.append('adc_id', filters.adc_id);

            params.append('page', page);
            params.append('limit', 5);

            const response = await api.get(`/dashboard/matrix?${params.toString()}`);
            if (response.data.success) {
                setData({
                    columns: response.data.data.columns,
                    rows: response.data.data.rows
                });
                setPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error("Error fetching matrix:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatrix();
    }, [page]); // Only refetch on page change automatically

    const handleFiltrar = () => {
        setPage(1);
        fetchMatrix();
    };

    const handleExportPdf = () => {
        const params = new URLSearchParams();
        if (filters.contratista_id !== 'todos') params.append('contratista_id', filters.contratista_id);
        if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
        if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
        if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
        if (filters.periodo_desde) params.append('periodo_desde', filters.periodo_desde);
        if (filters.periodo_hasta) params.append('periodo_hasta', filters.periodo_hasta);
        params.append('token', localStorage.getItem('token'));
        window.open(`${api.defaults.baseURL}/reportes/matrix/pdf?${params.toString()}`, '_blank');
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams();
        if (filters.contratista_id !== 'todos') params.append('contratista_id', filters.contratista_id);
        if (filters.servicio_id !== 'todos') params.append('servicio_id', filters.servicio_id);
        if (filters.dependencia_id !== 'todas') params.append('dependencia_id', filters.dependencia_id);
        if (filters.programa_id !== 'todos') params.append('programa_id', filters.programa_id);
        if (filters.periodo_desde) params.append('periodo_desde', filters.periodo_desde);
        if (filters.periodo_hasta) params.append('periodo_hasta', filters.periodo_hasta);
        params.append('token', localStorage.getItem('token'));
        window.open(`${api.defaults.baseURL}/reportes/matrix/excel?${params.toString()}`, '_blank');
    };

    const thStyle = {
        padding: '12px 16px', fontWeight: 600, fontSize: '11px',
        textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px',
        borderBottom: '2px solid #e2e8f0', background: '#f8fafc',
        whiteSpace: 'nowrap'
    };

    const tdStyle = {
        padding: '12px 16px', fontSize: '12px', color: '#1e293b',
        borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle'
    };

    const cellBorder = { borderLeft: '1px solid #f1f5f9' };

    const getCellBg = (declarado) => {
        const val = parseFloat(declarado);
        if (val >= 85) return '#f0fdf4';     // green-50
        if (val >= 70) return '#fefce8';     // yellow-50
        return '#fef2f2';                     // red-50
    };

    const getColorForValue = (val) => {
        const num = parseFloat(val);
        if (isNaN(num) || val === null) return '#64748b';
        if (num >= 85) return '#059669';  // Stronger green for text
        if (num >= 70) return '#d97706';  // Stronger yellow for text
        return '#dc2626';                 // Stronger red for text
    };

    const isContractor = ['contratista_admin', 'contratista_user'].includes(user?.role);
    const isContratistaUser = user?.role === 'contratista_user';

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1rem' }}>
            {/* Header & Title */}
            <div style={{ marginBottom: '2rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                    padding: '10px', background: '#eff6ff', borderRadius: '12px',
                    color: '#003594', boxShadow: '0 2px 4px rgba(0, 53, 148,0.1)'
                }}>
                    <Monitor size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                        Matriz de Cumplimiento
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                        Visión por vinculación: servicios con programa asignado
                    </p>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={{
                background: '#fff', padding: '1.5rem', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem'
            }}>
                <SearchableSelect
                    label="Empresa / Contratista"
                    icon={Briefcase}
                    value={filters.contratista_id}
                    onChange={(val) => setFilters(f => ({ ...f, contratista_id: val }))}
                    options={options.contratistas}
                    disabled={isContractor}
                    placeholder="Todas las empresas"
                    showAllOption={true}
                />
                <SearchableSelect
                    label="Servicio / Rubro"
                    icon={FileText}
                    value={filters.servicio_id}
                    onChange={(val) => setFilters(f => ({ ...f, servicio_id: val }))}
                    options={options.servicios}
                    disabled={isContratistaUser}
                    placeholder="Todos los servicios"
                    showAllOption={true}
                />
                <SearchableSelect
                    label="Dependencia / Planta"
                    icon={MapPin}
                    value={filters.dependencia_id}
                    onChange={(val) => setFilters(f => ({ ...f, dependencia_id: val }))}
                    options={options.dependencias}
                    disabled={isContratistaUser}
                    placeholder="Todas las dependencias"
                    showAllOption={true}
                />
                <SearchableSelect
                    label="Programa OIEM"
                    icon={Filter}
                    value={filters.programa_id}
                    onChange={(val) => setFilters(f => ({ ...f, programa_id: val }))}
                    options={options.programas}
                    placeholder="Todos los programas"
                    showAllOption={true}
                />
                <SearchableSelect
                    label="Admin Contrato"
                    icon={User}
                    value={filters.adc_id}
                    onChange={(val) => setFilters(f => ({ ...f, adc_id: val }))}
                    options={options.admins}
                    placeholder="Todos los Administradores"
                    showAllOption={true}
                />

                {/* Status filter (Simplified select is fine here as it's only 2 options) */}
                <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '11px', fontWeight: 600, color: '#64748b',
                        marginBottom: '6px', textTransform: 'uppercase'
                    }}>
                        <FileText size={12} className="text-slate-400" />
                        Estado Registros
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={filters.tiene_registros}
                            onChange={(e) => setFilters(f => ({ ...f, tiene_registros: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '8px 32px 8px 12px',
                                fontSize: '13px',
                                color: '#1e293b',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                appearance: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                minHeight: '38px'
                            }}
                        >
                            <option value="todos">Todos</option>
                            <option value="si">Con registros</option>
                            <option value="no">Sin registros</option>
                        </select>
                        <div style={{
                            position: 'absolute', right: '10px', top: '50%',
                            transform: 'translateY(-50%)', pointerEvents: 'none',
                            color: '#94a3b8'
                        }}>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '11px', fontWeight: 600, color: '#64748b',
                        marginBottom: '6px', textTransform: 'uppercase'
                    }}>
                        <Monitor size={12} className="text-slate-400" />
                        Periodo (Desde)
                    </label>
                    <input
                        type="month"
                        value={filters.periodo_desde}
                        onChange={(e) => setFilters(f => ({ ...f, periodo_desde: e.target.value, periodo_hasta: e.target.value }))}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: '#1e293b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            minHeight: '38px'
                        }}
                    />
                </div>

                <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '11px', fontWeight: 600, color: '#64748b',
                        marginBottom: '6px', textTransform: 'uppercase'
                    }}>
                        <Monitor size={12} className="text-slate-400" />
                        Periodo (Hasta)
                    </label>
                    <input
                        type="month"
                        value={filters.periodo_hasta}
                        onChange={(e) => setFilters(f => ({ ...f, periodo_hasta: e.target.value }))}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: '#1e293b',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            minHeight: '38px'
                        }}
                    />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap', paddingBottom: '2px' }}>
                    <button
                        onClick={handleFiltrar}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: '#003594',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            height: '42px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 53, 148, 0.2)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#002a75'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#003594'}
                    >
                        <Search size={16} />
                        Filtrar
                    </button>

                    <button
                        onClick={handleClearFilters}
                        title="Limpiar todos los filtros"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            color: '#64748b',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            height: '42px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <XCircle size={16} />
                        Limpiar
                    </button>

                    <div style={{ width: '1px', height: '30px', background: '#e2e8f0', margin: '0 4px' }}></div>

                    <button
                        onClick={handleExportPdf}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#fff',
                            border: '1px solid #fee2e2',
                            borderRadius: '10px',
                            color: '#dc2626',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            height: '42px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <FileText size={16} />
                        PDF
                    </button>

                    <button
                        onClick={handleExportExcel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#fff',
                            border: '1px solid #dcfce7',
                            borderRadius: '10px',
                            color: '#16a34a',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            height: '42px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <FileSpreadsheet size={16} />
                        Excel
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div style={{
                background: '#fff', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)',
                border: '1px solid #e2e8f0',
                marginBottom: '2rem'
            }}>
                <div style={{
                    padding: '1.5rem', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '20px', background: '#3b82f6', borderRadius: '2px' }}></div>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 700 }}>
                            Detalle de Cumplimiento
                        </h3>
                    </div>
                    {loading ? (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                            Actualizando matriz...
                        </div>
                    ) : (
                        <span style={{
                            fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600,
                            background: '#eff6ff', padding: '4px 12px', borderRadius: '99px'
                        }}>
                            {pagination.total} vinculaciones encontradas
                        </span>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%', borderCollapse: 'collapse',
                        fontSize: '12px', textAlign: 'left'
                    }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, textAlign: 'center', width: '40px' }}>#</th>
                                <th style={thStyle}>Contratista / RUT</th>
                                <th style={thStyle}>Programa / Servicio</th>
                                <th style={thStyle}>Dependencia</th>
                                {data.columns.map((col, idx) => (
                                    <th key={col.key} style={{
                                        ...thStyle, textAlign: 'center', ...cellBorder,
                                        minWidth: '150px',
                                        background: idx === data.columns.length - 1 ? '#fff7ed' : '#f8fafc'
                                    }}>
                                        <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700 }}>
                                            {col.label}
                                        </div>
                                        <div style={{ fontSize: '8px', fontWeight: 400, color: '#94a3b8', marginTop: '4px', letterSpacing: '0.5px' }}>
                                            DECL. | AUDIT.
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && data.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={data.columns.length + 4} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <Filter size={48} className="text-slate-200" />
                                            <p style={{ margin: 0, fontSize: '1rem' }}>No se encontraron vinculaciones con los filtros seleccionados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.rows.map((row, index) => (
                                    <tr key={row.id} style={{ transition: 'background 0.2s' }} className="hover:bg-slate-50">
                                        <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>
                                            {(page - 1) * 10 + index + 1}
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.contratista}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{row.rut}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ color: '#003594', fontWeight: 600 }}>{row.programa}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{row.servicio}</div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                display: 'inline-flex', padding: '4px 10px',
                                                background: '#f1f5f9', color: '#475569',
                                                borderRadius: '6px', fontSize: '11px', fontWeight: 500
                                            }}>
                                                {row.dependencia}
                                            </span>
                                        </td>

                                        {data.columns.map((col, idx) => {
                                            const cell = row.data[col.key];
                                            const isLast = idx === data.columns.length - 1;

                                            return (
                                                <td key={col.key} style={{
                                                    ...tdStyle, textAlign: 'center', ...cellBorder,
                                                    background: cell ? (isLast ? '#fff7ed' : getCellBg(cell.declarado)) : 'transparent',
                                                }}>
                                                    {cell ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '13px' }}>
                                                                <span style={{ color: getColorForValue(cell.declarado) }}>
                                                                    {cell.declarado}%
                                                                </span>
                                                                {cell.auditado !== null && (
                                                                    <>
                                                                        <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '11px' }}> | </span>
                                                                        <span style={{ color: getColorForValue(cell.auditado) }}>
                                                                            {cell.auditado}%
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                                {cell.estado?.replace('_', ' ')}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#e2e8f0' }}>-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{
                    padding: '1rem 1.5rem',
                    background: '#fff',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Mostrando <span style={{ fontWeight: 600, color: '#1e293b' }}>{(page - 1) * 10 + 1}</span> a <span style={{ fontWeight: 600, color: '#1e293b' }}>{Math.min(page * 10, pagination.total)}</span> de <span style={{ fontWeight: 600, color: '#1e293b' }}>{pagination.total}</span> registros
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            style={{
                                padding: '6px 14px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: '#fff',
                                color: page === 1 ? '#cbd5e1' : '#475569',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Anterior
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1))
                            .map((p, i, arr) => (
                                <Fragment key={p}>
                                    {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '0 8px', color: '#cbd5e1' }}>...</span>}
                                    <button
                                        onClick={() => setPage(p)}
                                        style={{
                                            padding: '6px 12px',
                                            border: '1px solid',
                                            borderColor: page === p ? '#3b82f6' : '#e2e8f0',
                                            borderRadius: '8px',
                                            background: page === p ? '#eff6ff' : '#fff',
                                            color: page === p ? '#003594' : '#475569',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            minWidth: '36px'
                                        }}
                                    >
                                        {p}
                                    </button>
                                </Fragment>
                            ))}

                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages || loading}
                            style={{
                                padding: '6px 14px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: '#fff',
                                color: page === pagination.totalPages ? '#cbd5e1' : '#475569',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                .hover\\:bg-slate-50:hover {
                    background-color: #f8fafc !important;
                }
            `}</style>
        </div >
    );
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const ComplianceChart = ({ data }) => {
    // Colors based on Semaforo logic
    const COLORS = {
        green: '#10b981',
        yellow: '#f59e0b',
        red: '#ef4444'
    };

    const getSemaforoColor = (value) => {
        const val = parseFloat(value);
        if (val >= 85) return COLORS.green;
        if (val >= 70) return COLORS.yellow;
        return COLORS.red;
    };

    const getPatternId = (value) => {
        const val = parseFloat(value);
        if (val >= 85) return 'pattern-green';
        if (val >= 70) return 'pattern-yellow';
        return 'pattern-red';
    };

    // data expected format: [{ name: 'Ene', declarado: 85, auditado: 82 }, ...]

    if (!data || data.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No hay datos suficientes para mostrar la tendencia.</div>;
    }

    return (
        <div style={{ width: '100%', height: 380, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    barGap={8}
                >
                    <defs>
                        {/* Define patterns for each semaforo color for "Auditado" bars */}
                        {Object.entries(COLORS).map(([name, color]) => (
                            <pattern
                                key={`pattern-${name}`}
                                id={`pattern-${name}`}
                                patternUnits="userSpaceOnUse"
                                width="8"
                                height="8"
                                patternTransform="rotate(45)"
                            >
                                <rect width="8" height="8" fill={color} />
                                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.15)" strokeWidth="4" />
                            </pattern>
                        ))}
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px',
                            padding: '12px'
                        }}
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }}
                    />
                    <Bar
                        dataKey="declarado"
                        name="Promedio Declarado"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-dec-${index}`} fill={getSemaforoColor(entry.declarado)} />
                        ))}
                    </Bar>
                    <Bar
                        dataKey="auditado"
                        name="Promedio Auditado (Validado)"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-aud-${index}`} fill={`url(#${getPatternId(entry.auditado)})`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ComplianceChart;

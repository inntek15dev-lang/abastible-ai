import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ComplianceChart = ({ data }) => {
    // data expected format: [{ name: 'Ene', uv: 85 }, { name: 'Feb', uv: 90 }]

    if (!data || data.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No hay datos suficientes para mostrar la tendencia.</div>;
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        domain={[0, 100]}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="cumplimiento"
                        stroke="var(--color-brand-primary)"
                        fill="var(--color-brand-primary)"
                        fillOpacity={0.1}
                        name="Cumplimiento %"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ComplianceChart;

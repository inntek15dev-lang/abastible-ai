import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ComplianceChart = ({ data }) => {
    // data expected format: [{ name: 'Ene', cumplimiento: 85 }, { name: 'Feb', cumplimiento: 90 }]

    if (!data || data.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No hay datos suficientes para mostrar la tendencia.</div>;
    }

    const getBarColor = (value) => {
        if (value >= 85) return '#10b981'; // Green
        if (value >= 70) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
                        cursor={{ fill: '#f3f4f6' }}
                    />
                    <Bar dataKey="cumplimiento" name="Cumplimiento %" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.cumplimiento)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ComplianceChart;

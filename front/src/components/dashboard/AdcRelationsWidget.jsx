import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Users, ArrowRight } from 'lucide-react';
import api from '../../api';

/**
 * AdcRelationsWidget
 * Widget para mostrar Contratistas y Dependencias asignadas al ADC.
 */
export default function AdcRelationsWidget({ userId }) {
    const [data, setData] = useState({ empresas: [], dependencias: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelations = async () => {
            try {
                // Fetch direct assignments via resource controller or user details
                const res = await api.get(`/resources/adc-scope`);
                setData(res.data.data);
            } catch (error) {
                console.error("Error fetching ADC relations:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchRelations();
    }, [userId]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando alcances...</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* Contractors Card */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#eff6ff', borderRadius: '8px', color: '#1e40af' }}>
                        <Building2 size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Empresas Contratistas</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.empresas.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay empresas asignadas.</p>
                    ) : (
                        data.empresas.map(e => (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{e.nombre}</span>
                                <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>{e.rut}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Dependencies Card */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534' }}>
                        <MapPin size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Dependencias / Gerencias</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'wrap', gap: '8px', flexWrap: 'wrap' }}>
                    {data.dependencias.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay dependencias asignadas.</p>
                    ) : (
                        data.dependencias.map(d => (
                            <div key={d.id} style={{ padding: '6px 12px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                {d.nombre}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

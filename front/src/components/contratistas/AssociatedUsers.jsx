import { useState, useEffect } from 'react';
import api from '../../api';
import { User, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function AssociatedUsers({ contratistaId }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch users where contratista_id matches
                const response = await api.get(`/usuarios?contratista_id=${contratistaId}`);
                setUsers(response.data.data || []);
            } catch (error) {
                console.error('Error fetching associated users:', error);
            } finally {
                setLoading(false);
            }
        };

        if (contratistaId) {
            fetchUsers();
        }
    }, [contratistaId]);

    if (loading) return <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cargando usuarios...</div>;

    if (users.length === 0) {
        return <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay usuarios operativos asociados.</div>;
    }

    return (
        <div className="associated-users-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(user => (
                <div key={user.id} style={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #f1f5f9', 
                    borderRadius: '8px', 
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', color: '#1e293b', fontSize: '0.85rem' }}>
                        <User size={14} className="text-primary" />
                        {user.name}
                        <span style={{ 
                            fontSize: '0.7rem', 
                            backgroundColor: user.role === 'contratista_admin' ? '#dcfce7' : '#f1f5f9',
                            color: user.role === 'contratista_admin' ? '#15803d' : '#475569',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontWeight: '600'
                        }}>
                            {user.role === 'contratista_admin' ? 'ADMIN EECC' : 'OPERATIVO'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem' }}>
                        <Mail size={12} />
                        {user.email}
                    </div>
                    {user.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem' }}>
                            <Phone size={12} />
                            {user.telefono}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// IEEE Trace: Sprint 7 | Privilege Matrix UI
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { Shield, Save, ArrowLeft, Check, X } from 'lucide-react';

// List of modules to manage
// Ideally this should come from backend, but for now we define the known system modules.
const SYSTEM_MODULES = [
    'Dashboard',
    'Programas',
    'Elementos',
    'Actividades',
    'Registros',
    'Registros_Exportar', // Granular
    'Evidencias',
    'Auditoria',
    'Hallazgos',
    'Compromisos',
    'Reaperturas',
    'Usuarios',
    'Admin_Usuarios' // Meta-privilege for managing roles
];

export default function PrivilegeManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [privileges, setPrivileges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleName, setRoleName] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            // Fetch role details (hacky: list all and find) or add show endpoint. 
            // Let's rely on just fetching privileges and maybe role name if available?
            // We'll update backend to include role name in response or just fetch all roles locally for now.
            const rolesRes = await api.get('/roles');
            const role = rolesRes.data.data.find(r => r.id == id);
            if (role) setRoleName(role.name);

            const privRes = await api.get(`/roles/${id}/privileges`);

            // Map backend privileges to our SYSTEM_MODULES list
            const currentPrivs = privRes.data.data;
            const seed = SYSTEM_MODULES.map(mod => {
                const existing = currentPrivs.find(p => p.ref_modulo === mod);
                return {
                    ref_modulo: mod,
                    read: existing ? !!existing.read : false,
                    write: existing ? !!existing.write : false,
                    excec: existing ? !!existing.excec : false
                };
            });
            setPrivileges(seed);
        } catch (err) {
            console.error(err);
            alert('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (moduleName, type) => {
        setPrivileges(prev => prev.map(p => {
            if (p.ref_modulo === moduleName) {
                return { ...p, [type]: !p[type] };
            }
            return p;
        }));
    };

    const handleSave = async () => {
        try {
            await api.put(`/roles/${id}/privileges`, { privileges });
            alert('Privilegios actualizados correctamente');
            navigate('/roles');
        } catch (err) {
            alert('Error al guardar privilegios');
        }
    };

    const toggleRow = (moduleName, status) => {
        setPrivileges(prev => prev.map(p => {
            if (p.ref_modulo === moduleName) {
                return { ...p, read: status, write: status, excec: status };
            }
            return p;
        }));
    };

    if (loading) return <div className="loading">Cargando matriz...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="btn-icon" onClick={() => navigate('/roles')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0 }}>Matriz de Privilegios</h1>
                        <span className="subtitle">Rol: <strong>{roleName.toUpperCase()}</strong></span>
                    </div>
                </div>
                <button className="btn-primary" onClick={handleSave}>
                    <Save size={16} /> Guardar Cambios
                </button>
            </header>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: 200 }}>Módulo / Componente</th>
                            <th className="text-center" width="100">Leer (Read)</th>
                            <th className="text-center" width="100">Escribir (Write)</th>
                            <th className="text-center" width="100">Ejecutar (Exec)</th>
                            <th className="text-center" width="120">Acciones Rápidas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {privileges.map((priv) => (
                            <tr key={priv.ref_modulo}>
                                <td>
                                    <strong>{priv.ref_modulo}</strong>
                                </td>
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={priv.read}
                                        onChange={() => handleToggle(priv.ref_modulo, 'read')}
                                        style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                                    />
                                </td>
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={priv.write}
                                        onChange={() => handleToggle(priv.ref_modulo, 'write')}
                                        style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                                    />
                                </td>
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={priv.excec}
                                        onChange={() => handleToggle(priv.ref_modulo, 'excec')}
                                        style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                                    />
                                </td>
                                <td className="text-center">
                                    <div className="btn-icon-group" style={{ justifyContent: 'center' }}>
                                        <button className="btn-icon" onClick={() => toggleRow(priv.ref_modulo, true)} title="Habilitar Todo">
                                            <Check size={16} className="text-success" />
                                        </button>
                                        <button className="btn-icon" onClick={() => toggleRow(priv.ref_modulo, false)} title="Deshabilitar Todo">
                                            <X size={16} className="text-danger" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

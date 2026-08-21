import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function LoginExternal() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginWithExternalToken, logout } = useAuth();
    
    const [status, setStatus] = useState('loading'); // 'loading' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Support token or data parameters
        const token = searchParams.get('token') || searchParams.get('data');

        if (!token) {
            const msg = 'No se proporcionó un token de acceso externo válido en la URL.';
            setStatus('error');
            setErrorMsg(msg);
            alert(`⚠️ Error de Acceso SSO OVAL:\n\nMotivo: ${msg}\n\nHaga clic en Aceptar para ver la pantalla de inicio de sesión.`);
            return;
        }

        const authenticate = async () => {
            try {
                // Clear any existing session to ensure clean request headers/state
                logout();
                await loginWithExternalToken(token);
                // Success! Redirect to home page
                navigate('/', { replace: true });
            } catch (err) {
                console.error('External login error:', err);
                const exactReason = err.response?.data?.message || err.response?.data?.error || 'Error al validar las credenciales externas con OVAL.';
                setStatus('error');
                setErrorMsg(exactReason);
                alert(`⚠️ Error de Autenticación SSO OVAL:\n\nMotivo exacto del rechazo:\n"${exactReason}"\n\nHaga clic en Aceptar para ver el detalle y regresar al inicio de sesión.`);
            }
        };

        authenticate();
    }, [searchParams, loginWithExternalToken, logout, navigate]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2.5rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                width: '450px',
                maxWidth: '90%',
                textAlign: 'center',
                border: '1px solid #e2e8f0'
            }}>
                {status === 'loading' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <Loader2 size={44} className="spin" style={{ color: '#003594', animation: 'spin 1s linear infinite' }} />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                                Validando Acceso Externo
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                                Por favor espere mientras autorizamos su sesión...
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                            backgroundColor: '#fef2f2',
                            padding: '12px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            color: '#ef4444'
                        }}>
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.5rem 0' }}>
                                Error de Acceso
                            </h2>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                {errorMsg}
                            </p>
                        </div>
                        
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                marginTop: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#003594',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#002566'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#003594'}
                        >
                            <ArrowLeft size={16} /> Volver al Inicio de Sesión
                        </button>
                    </div>
                )}
            </div>
            
            {/* Simple CSS animation for spinner */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
}

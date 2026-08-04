// Recuperación de contraseña (contratista_user) — solicitud del enlace por correo.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Login.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h1>OIEM Abastible</h1>
                    <p>Recuperar Contraseña</p>
                </div>

                {sent ? (
                    <div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
                            Si el correo ingresado corresponde a una cuenta de contratista registrada, le hemos enviado un enlace para restablecer su contraseña. Revise su bandeja de entrada (y la carpeta de spam).
                        </p>
                        <Link to="/login" className="btn-primary" style={{ display: 'block', textDecoration: 'none', boxSizing: 'border-box' }}>
                            Volver al inicio de sesión
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message">{error}</div>}

                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, textAlign: 'left' }}>
                            Ingrese el correo con el que accede a la plataforma. Le enviaremos un enlace para elegir una nueva contraseña.
                        </p>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="correo@ejemplo.cl"
                                required
                                autoComplete="username"
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                            <Link to="/login" style={{ fontSize: '0.85rem' }}>Volver al inicio de sesión</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

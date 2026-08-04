// Recuperación de contraseña (contratista_user) — vista de confirmación llegando desde
// el enlace del correo. Espejo de las reglas de back/src/utils/passwordPolicy.js: deben
// mantenerse iguales en ambos lados si se ajustan a futuro.
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import './Login.css';

const SPECIAL_CHARS_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\]/;

function checkPasswordRules(password) {
    return [
        { label: 'Al menos 8 caracteres', valid: password.length >= 8 },
        { label: 'Al menos 4 letras', valid: (password.match(/[A-Za-z]/g) || []).length >= 4 },
        { label: 'Al menos 4 números', valid: (password.match(/[0-9]/g) || []).length >= 4 },
        { label: 'Al menos 1 carácter especial', valid: SPECIAL_CHARS_REGEX.test(password) },
        { label: 'Al menos 1 letra mayúscula', valid: /[A-Z]/.test(password) },
        { label: 'Al menos 1 letra minúscula', valid: /[a-z]/.test(password) }
    ];
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [status, setStatus] = useState('checking'); // checking | valid | invalid
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const validate = async () => {
            if (!token) {
                setStatus('invalid');
                return;
            }
            try {
                const res = await api.get(`/auth/reset-password/${encodeURIComponent(token)}`);
                setEmail(res.data.email || '');
                setStatus('valid');
            } catch {
                setStatus('invalid');
            }
        };
        validate();
    }, [token]);

    const rules = useMemo(() => checkPasswordRules(password), [password]);
    const allRulesValid = rules.every(r => r.valid);
    const passwordsMatch = password.length > 0 && password === passwordConfirm;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!allRulesValid) {
            setError('La contraseña no cumple los requisitos mínimos de seguridad.');
            return;
        }
        if (!passwordsMatch) {
            setError('Las contraseñas ingresadas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                token,
                password,
                password_confirmation: passwordConfirm
            });
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h1>OIEM Abastible</h1>
                    <p>Restablecer Contraseña</p>
                </div>

                {status === 'checking' && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Verificando enlace...</p>
                )}

                {status === 'invalid' && (
                    <div>
                        <div className="error-message">El enlace de recuperación es inválido o ha expirado.</div>
                        <Link to="/recuperar-password" className="btn-primary" style={{ display: 'block', marginTop: '1rem', textDecoration: 'none', boxSizing: 'border-box' }}>
                            Solicitar un nuevo enlace
                        </Link>
                    </div>
                )}

                {status === 'valid' && done && (
                    <div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
                            Su contraseña fue actualizada correctamente. Será redirigido al inicio de sesión...
                        </p>
                        <Link to="/login" style={{ fontSize: '0.85rem' }}>Ir ahora al inicio de sesión</Link>
                    </div>
                )}

                {status === 'valid' && !done && (
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input id="email" type="email" value={email} readOnly disabled autoComplete="username" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Nueva Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="passwordConfirm">Confirmar Contraseña</label>
                            <input
                                id="passwordConfirm"
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                            />
                            {passwordConfirm.length > 0 && !passwordsMatch && (
                                <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '0.35rem' }}>Las contraseñas no coinciden</div>
                            )}
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left', fontSize: '0.8rem' }}>
                            {rules.map((r) => (
                                <li key={r.label} style={{ color: r.valid ? '#15803d' : '#64748b', marginBottom: '0.25rem' }}>
                                    {r.valid ? '✓' : '○'} {r.label}
                                </li>
                            ))}
                        </ul>

                        <button type="submit" className="btn-primary" disabled={loading || !allRulesValid || !passwordsMatch}>
                            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

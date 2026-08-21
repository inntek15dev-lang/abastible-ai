// IEEE Trace: REQ-001 | US-001 | api/index
import axios from 'axios';

// Get API URL dynamically from Nginx injected window.ENV, then Vite build env, then fallback
const rawApiUrl = (window.ENV && window.ENV.VITE_API_URL)
    ? window.ENV.VITE_API_URL
    : (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');

// Normalize: Remove trailing slash if exists
const dynamicApiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

const api = axios.create({
    baseURL: dynamicApiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isExternalLogin = error.config?.url?.includes('/auth/login-external');
            const serverMessage = error.response?.data?.message || error.response?.data?.error || 'Sesión expirada o no autorizada.';

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            if (isExternalLogin) {
                // Permite que LoginExternal.jsx capture el error en su try/catch y despliegue el pop-up emergente
                return Promise.reject(error);
            }

            // Pop-up con el motivo exacto antes de redirigir
            alert(`⚠️ Error de Autenticación:\n\nMotivo: ${serverMessage}\n\nHaga clic en Aceptar para ser redirigido al inicio de sesión.`);
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

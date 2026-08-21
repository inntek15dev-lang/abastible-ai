// IEEE Trace: REQ-007 | US-006 | context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Clear previous token and session state to ensure clean authentication for new login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);

        const response = await api.post('/auth/login', { email, password });
        const { token, user: userData } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        return userData;
    };

    const loginWithExternalToken = async (token) => {
        // Clear previous token and session state to ensure clean authentication for new login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);

        const response = await api.post('/auth/login-external', { token });
        const { token: jwtToken, user: userData } = response.data;

        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // Privilege check methods (privilegios-engine integration)
    const checkPrivilege = useCallback((module, action) => {
        // STRICT SECURITY RULE: contratista_user must never access Usuarios or Admin_Usuarios modules under any circumstances.
        if (user?.role === 'contratista_user' && ['Usuarios', 'Admin_Usuarios'].includes(module)) {
            return false;
        }

        // REGLA CRÍTICA PARKO: El módulo OVAL es EXCLUSIVO para el rol 'oval'
        if (module === 'OVAL') {
            return user?.role === 'oval';
        }

        if (user?.role === 'admin') return true;
        if (!user?.privileges) return false;

        // Check for wildcard (admin)
        const hasWildcard = user.privileges.some(p => p.module === '*' && p[action]);
        if (hasWildcard) return true;

        // Hardcode: Contratista Admin has access to Usuarios
        if (user.role === 'contratista_admin' && module === 'Usuarios') return true;

        // Hardcode: Contratistas have access to Compromisos
        if (['contratista_admin', 'contratista_user'].includes(user?.role) && module === 'Compromisos') return true;

        // Check specific module
        return user.privileges.some(p => p.module === module && p[action]);
    }, [user]);

    const canRead = useCallback((module) => checkPrivilege(module, 'read'), [checkPrivilege]);
    const canWrite = useCallback((module) => checkPrivilege(module, 'write'), [checkPrivilege]);
    const canExec = useCallback((module) => checkPrivilege(module, 'excec'), [checkPrivilege]);

    const isAdmin = user?.role === 'admin' || canRead('*');

    const value = {
        user,
        loading,
        login,
        loginWithExternalToken,
        logout,
        canRead,
        canWrite,
        canExec,
        isAdmin
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;

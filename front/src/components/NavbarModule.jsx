import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVisibleModules } from '../config/navigation';
import { LogOut, ChevronDown, UserCircle, HelpCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import './NavbarModule.css';

export default function NavbarModule() {
    const { user, logout, canRead } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeDropdown, setActiveDropdown] = useState(null); // module.id or 'user' or null
    const navbarRef = useRef(null);

    // Color theme circles — only visible on registro form routes
    const isRegistroFormRoute = /^\/registros\/(new|\d+)/.test(location.pathname);
    const [registroTheme, setRegistroTheme] = useState('orange');

    const handleThemeChange = useCallback((theme) => {
        setRegistroTheme(theme);
        window.dispatchEvent(new CustomEvent('registro-theme-change', { detail: { theme } }));
    }, []);

    // Reset theme when navigating away from registro form
    useEffect(() => {
        if (isRegistroFormRoute) {
            window.dispatchEvent(new CustomEvent('registro-theme-change', { detail: { theme: registroTheme } }));
        }
    }, [isRegistroFormRoute]);

    // Close dropdowns when clicking outside navbar
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdowns on route change
    useEffect(() => {
        setActiveDropdown(null);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const modules = getVisibleModules(canRead);

    const isModuleActive = (module) => {
        if (module.path === location.pathname) return true;
        if (module.items) {
            return module.items.some(item => item.path === location.pathname);
        }
        return false;
    };

    const toggleDropdown = (id) => {
        setActiveDropdown(prev => prev === id ? null : id);
    };

    return (
        <header className="main-navbar" ref={navbarRef}>
            <div className="navbar-container">
                {/* Brand */}
                <div className="navbar-brand">
                    <img src="/logo.svg" alt="Abastible" className="navbar-logo" />
                </div>

                {/* Module Tabs (Desktop) */}
                <nav className="navbar-modules">
                    {modules.map((module) => (
                        <div key={module.id} className="module-item">
                            {module.items ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => toggleDropdown(module.id)}
                                        aria-expanded={activeDropdown === module.id}
                                        className={`module-link ${isModuleActive(module) ? 'active' : ''} outline-none`}
                                        style={{
                                            '--module-color': module.color
                                        }}
                                    >
                                        <module.icon size={18} />
                                        <span>{module.label}</span>
                                        <ChevronDown size={14} className={`ml-1 transition-transform ${activeDropdown === module.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    {activeDropdown === module.id && (
                                        <div className="dropdown-menu">
                                            {module.items.map((item) => (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setActiveDropdown(null)}
                                                    className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                                                >
                                                    <item.icon size={16} />
                                                    {item.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <NavLink
                                    to={module.path}
                                    onClick={() => setActiveDropdown(null)}
                                    className={({ isActive }) => `module-link ${isActive ? 'active' : ''}`}
                                    style={{
                                        '--module-color': module.color
                                    }}
                                    title={module.id === 'tutoriales' ? module.label : undefined}
                                >
                                    <module.icon size={18} />
                                    {module.id === 'tutoriales' ? (
                                        <HelpCircle size={18} />
                                    ) : (
                                        <span>{module.label}</span>
                                    )}
                                </NavLink>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Color Theme Circles — Only on Registro Form */}
                {isRegistroFormRoute && (
                    <div className="theme-circles-container">
                        <button
                            type="button"
                            className={`theme-circle ${registroTheme === 'orange' ? 'active' : ''}`}
                            style={{ backgroundColor: '#fe5000' }}
                            onClick={() => handleThemeChange('orange')}
                            title="Tema Naranja"
                            aria-label="Tema Naranja"
                        />
                        <button
                            type="button"
                            className={`theme-circle ${registroTheme === 'blue' ? 'active' : ''}`}
                            style={{ backgroundColor: '#003594' }}
                            onClick={() => handleThemeChange('blue')}
                            title="Tema Azul"
                            aria-label="Tema Azul"
                        />
                        <button
                            type="button"
                            className={`theme-circle ${registroTheme === 'dark' ? 'active' : ''}`}
                            style={{ backgroundColor: '#1f2937' }}
                            onClick={() => handleThemeChange('dark')}
                            title="Modo Oscuro"
                            aria-label="Modo Oscuro"
                        />
                    </div>
                )}

                {/* User Profile */}
                <div className="navbar-user">
                    <button
                        type="button"
                        onClick={() => toggleDropdown('user')}
                        aria-expanded={activeDropdown === 'user'}
                        className="user-btn outline-none"
                    >
                        <div className="user-avatar">
                            <UserCircle size={20} />
                        </div>
                        <div className="user-info-mini">
                            <span className="name">{user?.name}</span>
                            <span className="role">{user?.role}</span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'user' ? 'rotate-180' : ''}`} />
                    </button>
                    {activeDropdown === 'user' && (
                        <div className="dropdown-menu right">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDropdown(null);
                                    handleLogout();
                                }}
                                className="dropdown-item text-red-600 hover:bg-red-50 text-left w-full border-none bg-transparent cursor-pointer"
                            >
                                <LogOut size={16} />
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

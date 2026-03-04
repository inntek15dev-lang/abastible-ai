import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVisibleModules } from '../config/navigation';
import { LogOut, ChevronDown, UserCircle, Menu as MenuIcon } from 'lucide-react';
import { Menu, MenuTrigger, Popover, Button, MenuItem } from 'react-aria-components';
import { Fragment, useState, useEffect, useCallback } from 'react';
import './NavbarModule.css';

export default function NavbarModule() {
    const { user, logout, canRead } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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
            // Dispatch default theme on mount
            window.dispatchEvent(new CustomEvent('registro-theme-change', { detail: { theme: registroTheme } }));
        }
    }, [isRegistroFormRoute]);

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

    return (
        <header className="main-navbar">
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
                                <MenuTrigger>
                                    <Button
                                        className={`module-link ${isModuleActive(module) ? 'active' : ''} outline-none`}
                                        style={{
                                            '--module-color': module.color
                                        }}
                                    >
                                        <module.icon size={18} />
                                        <span>{module.label}</span>
                                        <ChevronDown size={14} className="ml-1" />
                                    </Button>
                                    <Popover placement="bottom start" className="dropdown-menu">
                                        <Menu className="outline-none p-0">
                                            {module.items.map((item) => (
                                                <MenuItem key={item.path} className="outline-none" textValue={item.label}>
                                                    <NavLink
                                                        to={item.path}
                                                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                                                    >
                                                        <item.icon size={16} />
                                                        {item.label}
                                                    </NavLink>
                                                </MenuItem>
                                            ))}
                                        </Menu>
                                    </Popover>
                                </MenuTrigger>
                            ) : (
                                <NavLink
                                    to={module.path}
                                    className={({ isActive }) => `module-link ${isActive ? 'active' : ''}`}
                                    style={{
                                        '--module-color': module.color
                                    }}
                                >
                                    <module.icon size={18} />
                                    <span>{module.label}</span>
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
                            style={{ backgroundColor: '#2563eb' }}
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
                    <MenuTrigger>
                        <Button className="user-btn outline-none">
                            <div className="user-avatar">
                                <UserCircle size={20} />
                            </div>
                            <div className="user-info-mini">
                                <span className="name">{user?.name}</span>
                                <span className="role">{user?.role}</span>
                            </div>
                            <ChevronDown size={14} />
                        </Button>
                        <Popover placement="bottom end" className="dropdown-menu right">
                            <Menu className="outline-none p-0" onAction={(key) => {
                                if (key === 'logout') handleLogout();
                            }}>
                                <MenuItem id="logout" className="outline-none" textValue="Cerrar Sesión">
                                    {({ isFocused }) => (
                                        <div className={`dropdown-item text-red-600 ${isFocused ? 'bg-red-50' : ''}`}>
                                            <LogOut size={16} />
                                            Cerrar Sesión
                                        </div>
                                    )}
                                </MenuItem>
                            </Menu>
                        </Popover>
                    </MenuTrigger>
                </div>
            </div>
        </header>
    );
}

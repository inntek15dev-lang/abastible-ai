// IEEE Trace: REQ-007 | US-051 | components/NavbarModule.jsx
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVisibleModules } from '../config/navigation';
import { LogOut, ChevronDown, UserCircle, Menu as MenuIcon } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import './NavbarModule.css';

export default function NavbarModule() {
    const { user, logout, canRead } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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
                    <div className="logo-circle">A</div>
                    <span className="logo-text">OIEM <span style={{ fontWeight: 300 }}>Abastible</span></span>
                </div>

                {/* Module Tabs (Desktop) */}
                <nav className="navbar-modules">
                    {modules.map((module) => (
                        <div key={module.id} className="module-item">
                            {module.items ? (
                                <Menu as="div" className="relative">
                                    <Menu.Button
                                        className={`module-link ${isModuleActive(module) ? 'active' : ''}`}
                                        style={{
                                            '--module-color': module.color
                                        }}
                                    >
                                        <module.icon size={18} />
                                        <span>{module.label}</span>
                                        <ChevronDown size={14} className="ml-1" />
                                    </Menu.Button>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items className="dropdown-menu">
                                            {module.items.map((item) => (
                                                <Menu.Item key={item.path}>
                                                    {({ active }) => (
                                                        <NavLink
                                                            to={item.path}
                                                            className={`dropdown-item ${active ? 'active' : ''}`}
                                                        >
                                                            <item.icon size={16} />
                                                            {item.label}
                                                        </NavLink>
                                                    )}
                                                </Menu.Item>
                                            ))}
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
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

                {/* User Profile */}
                <div className="navbar-user">
                    <Menu as="div" className="relative">
                        <Menu.Button className="user-btn">
                            <div className="user-avatar">
                                <UserCircle size={20} />
                            </div>
                            <div className="user-info-mini">
                                <span className="name">{user?.name}</span>
                                <span className="role">{user?.role}</span>
                            </div>
                            <ChevronDown size={14} />
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="dropdown-menu right">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleLogout}
                                            className={`dropdown-item text-red-600 ${active ? 'bg-red-50' : ''}`}
                                        >
                                            <LogOut size={16} />
                                            Cerrar Sesión
                                        </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>
        </header>
    );
}

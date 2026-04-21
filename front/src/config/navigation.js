// IEEE Trace: REQ-007 | US-051 | config/navigation.js
import {
    Home,
    FileText,
    Users,
    CheckSquare,
    RefreshCw,
    FolderOpen,
    Shield,
    Settings,
    UserCircle,
    Search,
    Building,
    BookOpen,
    Link,
    AlertTriangle
} from 'lucide-react';

export const MODULES = [
    {
        id: 'resumen',
        label: 'Resumen',
        path: '/',
        icon: Home,
        module: 'Dashboard', // Auth check based on Dashboard privilege
        color: '#3B82F6' // Blue (Tailwind blue-500)
    },
    {
        id: 'pendientes',
        label: 'Pendientes',
        path: '/pendientes',
        icon: AlertTriangle,
        module: 'Dashboard',
        color: '#EF4444' // Red
    },
    {
        id: 'reportes',
        label: 'Reportes',
        icon: FileText,
        color: '#10B981', // Emerald
        module: 'Reportes',
        items: [
            { path: '/reportes/cumplimiento', label: 'Matriz de Cumplimiento', icon: Building, module: 'Reportes' },
            { path: '/reportes', label: 'Reportes Consolidados', icon: FileText, module: 'Reportes' }
        ]
    },
    {
        id: 'operaciones',
        label: 'Operaciones',
        icon: FileText,
        color: '#fe5000', // Abastible Orange
        module: 'Registros', // General check for the module
        items: [
            { path: '/registros', label: 'Registros y Cumplimiento', icon: FileText, module: 'Registros' },
            { path: '/reaperturas', label: 'Solicitudes de Reapertura', icon: RefreshCw, module: 'Reaperturas' },
            { path: '/compromisos', label: 'Compromisos', icon: CheckSquare, module: 'Compromisos' }
        ]
    },

    {
        id: 'configuracion',
        label: 'Configuración',
        icon: Settings,
        color: '#8B5CF6', // Purple (Tailwind violet-500)
        module: 'Gestion_Configuracion',
        items: [
            { path: '/programas', label: 'Programas y Estándares', icon: FolderOpen, module: 'Programas' },
            { path: '/contratistas', label: 'Empresas Contratistas', icon: Building, module: 'Gestion_Configuracion' },
            { path: '/dependencias', label: 'Dependencias y Plantas', icon: Building, module: 'Gestion_Configuracion' },
            { path: '/servicios', label: 'Servicios y Tipos', icon: Settings, module: 'Gestion_Configuracion' }
        ]
    },
    {
        id: 'seguridad',
        label: 'Seguridad',
        icon: Shield,
        color: '#EF4444', // Red
        items: [
            { path: '/usuarios', label: 'Gestión de Usuarios', icon: Users, module: 'Usuarios' },
            { path: '/roles', label: 'Roles y Privilegios', icon: Shield, module: 'Admin_Usuarios' }
        ]
    },
    {
        id: 'tutoriales',
        label: 'Centro de Ayuda',
        icon: BookOpen,
        color: '#003594', // Blue
        path: '/tutorials',
        module: 'Dashboard' // Accessible to everyone
    }
];

function settingsIconHelper(type) {
    return Settings; // Fallback
}

// Helper to filter modules based on permissions
export function getVisibleModules(canRead) {
    return MODULES.map(module => {
        // First check if user has access to the main module category
        // If module.module is set, check it. If not, maybe check items?
        // Let's assume if the top level module requires a privilege, we check it.
        // But for 'Operaciones', we might want to show it if they have access to ANY of the sub-modules.

        let hasAccessToModule = true;

        // If it's a direct link (like Resumen), strictly check
        if (!module.items && module.module) {
            if (!canRead(module.module)) return null;
        }

        // If it has sub-items, filter them
        let visibleItems = [];
        if (module.items) {
            visibleItems = module.items.filter(item => {
                // 1. Check module permission
                if (item.module && !canRead(item.module)) return false;

                // 2. Check role restriction (Sprint 5)
                if (item.restrictedTo) {
                    const user = JSON.parse(localStorage.getItem('user')) || {};
                    if (!item.restrictedTo.includes(user.role)) return false;
                }

                return true;
            });

            // If no items are visible, don't show the module
            if (visibleItems.length === 0) return null;
        }

        // Return the module with filtered items
        return {
            ...module,
            items: visibleItems.length > 0 ? visibleItems : undefined
        };
    }).filter(Boolean);
}

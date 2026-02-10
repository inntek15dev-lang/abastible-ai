// IEEE Trace: REQ-007 | US-051 | config/navigation.js
import {
    Home,
    FileText,
    Users,
    CheckSquare,
    RefreshCw,
    FolderOpen,
    Briefcase,
    Shield,
    Settings,
    UserCircle,
    Search,
    Building
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
        id: 'operaciones',
        label: 'Operaciones',
        icon: FileText,
        color: '#F97316', // Orange (Tailwind orange-500)
        module: 'Registros', // General check for the module
        items: [
            { path: '/registros', label: 'Registros y Cumplimiento', icon: FileText, module: 'Registros' },
            { path: '/evidencias', label: 'Gestión de Evidencias', icon: FolderOpen, module: 'Evidencias' },
            { path: '/reaperturas', label: 'Solicitudes de Reapertura', icon: RefreshCw, module: 'Reaperturas' },
            { path: '/compromisos', label: 'Compromisos y Hallazgos', icon: CheckSquare, module: 'Compromisos' },
            { path: '/hallazgos', label: 'Hallazgos (Directo)', icon: Search, module: 'Registros' }, // Sprint 2 Gap
            { path: '/licitaciones', label: 'Licitaciones', icon: Briefcase, module: 'Licitaciones' },
            { path: '/mis-postulaciones', label: 'Mis Postulaciones', icon: FileText, module: 'Licitaciones' }
        ]
    },
    {
        id: 'personas',
        label: 'Personas',
        icon: Users,
        color: '#10B981', // Green (Tailwind emerald-500)
        module: 'Dashboard', // Using Dashboard for now as placeholder
        items: [
            { path: '#dotacion', label: 'Dotación (Proximamente)', icon: Users, module: 'Dashboard' },
            { path: '#turnos', label: 'Turnos (Proximamente)', icon: UserCircle, module: 'Dashboard' }
        ]
    },
    {
        id: 'configuracion',
        label: 'Configuración',
        icon: Settings,
        color: '#8B5CF6', // Purple (Tailwind violet-500)
        module: 'Programas', // Only for Admins usually
        items: [
            { path: '/programas', label: 'Programas y Estándares', icon: FolderOpen, module: 'Programas' },
            { path: '/contratistas', label: 'Empresas Contratistas', icon: Building, module: 'Usuarios' },
            { path: '/dependencias', label: 'Dependencias y Plantas', icon: Building, module: 'Programas' },
            { path: '/servicios', label: 'Servicios y Tipos', icon: Settings, module: 'Programas' },
            { path: '/elementos', label: 'Elementos', icon: settingsIconHelper('elementos'), module: 'Programas' },
            { path: '/actividades', label: 'Actividades', icon: settingsIconHelper('actividades'), module: 'Programas' }
        ]
    },
    {
        id: 'seguridad',
        label: 'Seguridad',
        icon: Shield,
        color: '#EF4444', // Red
        module: 'Usuarios',
        items: [
            { path: '/usuarios', label: 'Gestión de Usuarios', icon: Users, module: 'Usuarios' },
            { path: '/roles', label: 'Roles y Privilegios', icon: Shield, module: 'Admin_Usuarios' }
        ]
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
                // If item has a specific module requirement, check it
                return item.module ? canRead(item.module) : true;
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

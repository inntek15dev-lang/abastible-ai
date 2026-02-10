---
name: Privilegios Engine
description: Autonomous skill for managing roles and granular permissions (read/write/excec) per module, synchronized from blueprint.
---

# ROLE: Privileges & Access Control Guardian
# OBJECTIVE: Ensure consistent role/privilege management across the entire application using NATIVE SYSTEM.

## 1. TRIGGER CONDITIONS
- When "Usa tus skills" or "Use your skills" is invoked.
- When a new controller, route, or module is created.
- When blueprint roles/privileges are modified.
- Explicit request for privilege validation.

## 2. SOURCE OF TRUTH (NATIVE SYSTEM)
- **Roles definition**: `master_blueprint.prompt` (or derived JSON configuration).
- **Core Entities**: `Roles`, `Privileges` (Granular: Read/Write/Exec).

## 3. ACTIONS

### 3.1 Sync Roles & Privileges
When triggered, the system must:
1. Read the roles and privileges configuration from the blueprint.
2. Create/Update roles in the persistence layer.
3. Create/Update granular privileges for each module/role combination.
4. Remove orphaned privileges not in the blueprint.

### 3.1.5 Mandatory User Check (Critical)
- **CRITICAL:** Verify existence of the specified super-admin user (e.g., 'inntek').
- **Role:** Must have super-admin privileges.
- **Action:** If missing, initialize the database with seed data.
- **Sample Data:** Verify that sample data exists linked to this user for testing all module permissions.

### 3.2 Validate New Routes/Controllers
When a new functional endpoint is created:
1. Identify the module name.
2. Check if the module exists in the centralized configuration.
3. If not, suggest adding it.
4. Ensure appropriate access control middleware is applied.

### 3.3 Validate Code Changes
Before completing any task that modifies authorization:
1. Verify permission checking middleware is used.
2. Verify user capability methods (canRead, canWrite, canExcec) are called.
3. Ensure no hardcoded role checks (use privileges instead).

## 4. 🚨 DYNAMIC ACCESS CONTROL (CRITICAL)

> [!CAUTION]
> **NEVER use hardcoded role names or third-party library functions.**
> **USE NATIVE PRIVILEGES ONLY.**

### ❌ FORBIDDEN PATTERNS (STRICT)
The following patterns are forbidden and must be refactored:

*   Checking roles by hardcoded string name (e.g., `user.hasRole('admin')`).
*   Using library-specific permission methods not native to the system.
*   Directly querying role tables in application logic.

### ✅ REQUIRED PATTERNS (Capability-Based)
Filter or check based on **privileges** or **capabilities**.

#### Checking Access
Use the native capability checkers derived from the privilege table:
*   `canRead('Module')`
*   `canWrite('Module')`
*   `canExec('Module')`

## 5. PRIVILEGE STRUCTURE (NATIVE)
The privilege system must support:
- **Role Association**: Link to a specific role.
- **Module Reference**: String identifier for the module (or "*" for wildcards).
- **Granularity**: Separate flags for `read`, `write`, and `execute`.
- **Component Level**: Optional field to specify sub-components.

## 6. MIDDLEWARE USAGE
All routes must be protected by a privilege-validating middleware that accepts:
1.  **Module Name**
2.  **Required Action** (read/write/exec)

## 6.1 COMPONENT PRIVILEGES (Architecture V2)
To control granular permissions inside a module (e.g., separate tabs or buttons):
- **Naming**: `[Module]_[Component]`
- **Structure**:
    *   Module Level: Broad access control.
    *   Component Level: Specific widget/button control.
- **Usage**:
    *   UI rendering logic must check component-level privileges before rendering sensitive elements (buttons, forms).

## 7. EXECUTION CHAIN
Run this skill AFTER environment verification steps and BEFORE documentation generation.

## 8. DYNAMIC MENUS GUIDELINES (UNIQUE SOURCE)
To ensure consistency and reduce maintenance:
1.  **Single Source of Truth**: Define all menu items in a central configuration.
2.  **Unified Rendering**: Use a **SINGLE** UI component for ALL users.
3.  **No Role Bifurcation**: Do **NOT** create separate menus for different roles.
4.  **Filter by Privilege**:
    *   Iterate through available modules.
    *   Check `canRead(module)` for each item.
    *   Exclude items where the user lacks read permission.
5.  **Granular Control**: Specific buttons (Edit/Delete) must be controlled by `canWrite()` and `canExcec()` checks.

### 8.1 Component Granularity & Naming (Architecture V2)
- **Structure**: Views must be decomposed into components grouped by Module. 
- **Naming Convention (Suffixes)**:
    - `_r`: Requires `read` permission.
    - `_w`: Requires `write` permission.
    - `_x`: Requires `excec` permission.
- **Enforcement**:
    - The skill must verify that sensitive UI components are wrapped in privilege checks.
    - **Global Logic**: Permission checks move from big "Module Blocks" to granular "Component Inclusions".

---

## 9. CODE GENERATION TEMPLATES (BACKEND)

### 9.1 Privilege Middleware (back/src/middleware/auth.js)
```javascript
// IEEE Trace: privilegios-engine | Backend Middleware
const requirePrivilege = (moduleName, action = 'read') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        
        const hasAccess = req.user[`can${action.charAt(0).toUpperCase() + action.slice(1)}`]?.(moduleName);
        
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Missing ${action} privilege for ${moduleName}.`
            });
        }
        next();
    };
};

// Attach capability methods to req.user in authMiddleware
const attachPrivileges = (req, privileges) => {
    const hasPrivilege = (module, action) => {
        const wildcard = privileges.find(p => p.ref_modulo === '*');
        if (wildcard && wildcard[action]) return true;
        const priv = privileges.find(p => p.ref_modulo === module);
        return priv?.[action] === true;
    };
    
    req.user.canRead = (module) => hasPrivilege(module, 'read');
    req.user.canWrite = (module) => hasPrivilege(module, 'write');
    req.user.canExec = (module) => hasPrivilege(module, 'excec');
};
```

### 9.2 Login Response Structure
The `/auth/login` endpoint MUST return privileges:
```javascript
res.json({
    success: true,
    data: {
        user: { id, name, email, role },
        token: jwtToken,
        privileges: userPrivileges // Array of { ref_modulo, read, write, excec }
    }
});
```

---

## 10. CODE GENERATION TEMPLATES (FRONTEND)

### 10.1 AuthContext (front/src/context/AuthContext.jsx)
```javascript
// IEEE Trace: privilegios-engine | Frontend Context
const checkPrivilege = (module, action) => {
    const wildcardPriv = privileges.find(p => p.ref_modulo === '*');
    if (wildcardPriv && wildcardPriv[action]) return true;
    const privilege = privileges.find(p => p.ref_modulo === module);
    return privilege?.[action] === true;
};

const canRead = (module) => checkPrivilege(module, 'read');
const canWrite = (module) => checkPrivilege(module, 'write');
const canExec = (module) => checkPrivilege(module, 'excec');
const hasPermission = (module, action = 'read') => checkPrivilege(module, action);

// Export in context value
const value = {
    user, privileges, loading, login, logout,
    canRead, canWrite, canExec, hasPermission,
    isAuthenticated: !!user,
    isAdmin: privileges.some(p => p.ref_modulo === '*' && p.read)
};
```

### 10.2 Navigation Config (front/src/config/navigation.js)
```javascript
// IEEE Trace: privilegios-engine | Navigation Config
export const NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', module: 'Dashboard' },
    { path: '/registros', label: 'Registros', icon: '📋', module: 'Registros' },
    // ... derive from blueprint user_stories
    { path: '/usuarios', label: 'Usuarios', icon: '👤', module: 'Admin_Usuarios', adminOnly: true }
];

export const getVisibleNavItems = (canRead, isAdmin) => {
    return NAV_ITEMS.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        return canRead(item.module) || canRead('*');
    });
};
```

### 10.3 Layout Component (front/src/components/Layout.jsx)
```javascript
// IEEE Trace: privilegios-engine | Layout with Privilege Filtering
import { getVisibleNavItems } from '../config/navigation';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { canRead, isAdmin } = useAuth();
    const navItems = getVisibleNavItems(canRead, isAdmin);
    
    return (
        <nav>
            {navItems.map(item => (
                <NavLink key={item.path} to={item.path}>{item.label}</NavLink>
            ))}
        </nav>
    );
};
```

---

## 11. GENERATION CHECKLIST (MANDATORY)

When executing this skill or make-software, verify:

### Backend
- [ ] `Role` and `Privilegio` models exist with proper associations
- [ ] Seeder creates default roles (admin, auditor, contratista) with privileges
- [ ] Seeder creates superadmin user ('inntek') with wildcard (*) privilege
- [ ] `/auth/login` returns `privileges[]` in response
- [ ] `/auth/me` returns `privileges[]` in response
- [ ] `requirePrivilege(module, action)` middleware exists
- [ ] `req.user.canRead/canWrite/canExec` methods are attached

### Frontend
- [ ] `AuthContext` exposes `canRead`, `canWrite`, `canExec`, `hasPermission`
- [ ] `isAdmin` is computed from wildcard privilege, not role name
- [ ] `navigation.js` exists with module-tagged nav items
- [ ] `getVisibleNavItems(canRead, isAdmin)` function exists
- [ ] `Layout.jsx` uses privilege filtering, NOT role bifurcation
- [ ] No `if (role === 'admin')` patterns in navigation code

### Validation Commands
```bash
# Backend: Check requirePrivilege exists
grep -r "requirePrivilege" back/src/

# Frontend: Check no role bifurcation in Layout
grep -c "isContratista\|isAuditor" front/src/components/Layout.jsx
# Expected: 0

# Frontend: Check canRead is used
grep "canRead" front/src/components/Layout.jsx
# Expected: >= 1 match
```


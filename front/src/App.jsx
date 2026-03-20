// IEEE Trace: App Entry | App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout';

// Sprint 1 Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProgramaList from './pages/programas/ProgramaList';
import ProgramaForm from './pages/programas/ProgramaForm';
import ElementoList from './pages/programas/ElementoList';
import ElementoForm from './pages/programas/ElementoForm';
import ActividadList from './pages/programas/ActividadList';
import ActividadForm from './pages/programas/ActividadForm';
import RegistroList from './pages/registros/RegistroList';
import RegistroForm from './pages/registros/RegistroForm';
import UsuarioList from './pages/usuarios/UsuarioList';
import Pendientes from './pages/Pendientes';

// Sprint 2 Pages
import RegistroAudit from './pages/registros/RegistroAudit';
import CompromisoList from './pages/compromisos/CompromisoList';
import HallazgoList from './pages/registros/HallazgoList';

// Sprint 3 Pages
import ReaperturaList from './pages/reaperturas/ReaperturaList';

// Sprint 4 Pages
import ReporteList from './pages/reportes/ReporteList';
import ComplianceMatrixReport from './pages/reportes/ComplianceMatrixReport';

// Sprint 5 Pages
// Removed Licitacion/Postulacion lists
import UsuarioForm from './pages/usuarios/UsuarioForm';

// Sprint 8 Pages (US-051)
import EvidenciaList from './pages/registros/EvidenciaList';
import ContratistaList from './pages/contratistas/ContratistaList';
import ContratistaForm from './pages/contratistas/ContratistaForm';
import VinculacionList from './pages/vinculaciones/VinculacionList';
import VinculacionForm from './pages/vinculaciones/VinculacionForm';

// Sprint 7 Pages (Role Management)
import RoleList from './pages/admin/RoleList';
import PrivilegeManager from './pages/admin/PrivilegeManager';

// Sprint 9 Pages
import DependenciaList from './pages/configuracion/DependenciaList';
import DependenciaForm from './pages/configuracion/DependenciaForm';
import ServicioList from './pages/configuracion/ServicioList';
import ServicioForm from './pages/configuracion/ServicioForm';

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route wrapper (redirect if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import { TutorialProvider } from './context/TutorialContext';
import TutorialsPage from './pages/TutorialsPage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pendientes" element={<Pendientes />} />

        {/* Tutorials */}
        <Route path="/tutorials" element={<TutorialsPage />} />

        {/* Programas */}
        <Route path="/programas" element={<ProgramaList />} />
        <Route path="/programas/new" element={<ProgramaForm />} />
        <Route path="/programas/:id/edit" element={<ProgramaForm />} />

        {/* Elementos */}
        <Route path="/elementos" element={<ElementoList />} />
        <Route path="/elementos/new" element={<ElementoForm />} />
        <Route path="/elementos/:id/edit" element={<ElementoForm />} />

        {/* Actividades */}
        <Route path="/actividades" element={<ActividadList />} />
        <Route path="/actividades/new" element={<ActividadForm />} />
        <Route path="/actividades/:id/edit" element={<ActividadForm />} />

        {/* Registros */}
        <Route path="/registros" element={<RegistroList />} />
        <Route path="/registros/new" element={<RegistroForm />} />
        <Route path="/registros/:id/edit" element={<RegistroForm />} />
        <Route path="/registros/:id" element={<RegistroForm />} />
        <Route path="/registros/:id/auditar" element={<RegistroAudit />} />

        {/* Compromisos */}
        <Route path="/compromisos" element={<CompromisoList />} />

        {/* Hallazgos (Sprint 2 Gap) */}
        <Route path="/hallazgos" element={<HallazgoList />} />

        {/* Reaperturas */}
        <Route path="/reaperturas" element={<ReaperturaList />} />

        {/* Reportes (Sprint 4 Gap) */}
        <Route path="/reportes" element={<ReporteList />} />
        <Route path="/reportes/cumplimiento" element={<ComplianceMatrixReport />} />

        {/* Sprint 5: Licitaciones (REMOVED) */}
        {/* <Route path="/licitaciones" element={<LicitacionList />} /> */}
        {/* <Route path="/mis-postulaciones" element={<PostulacionList />} /> */}

        {/* Sprint 8: Nuevos Módulos US-051 */}
        <Route path="/evidencias" element={<EvidenciaList />} />
        <Route path="/contratistas" element={<ContratistaList />} />
        <Route path="/contratistas/new" element={<ContratistaForm />} />
        <Route path="/contratistas/:id" element={<ContratistaForm />} />

        {/* <Route path="/vinculaciones" element={<VinculacionList />} /> */}
        {/* <Route path="/vinculaciones/new" element={<VinculacionForm />} /> */}
        {/* <Route path="/vinculaciones/:id" element={<VinculacionForm />} /> */}

        {/* Sprint 7: Roles & Privileges */}
        <Route path="/roles" element={<RoleList />} />
        <Route path="/roles/:id/privileges" element={<PrivilegeManager />} />

        {/* Usuarios */}
        <Route path="/usuarios" element={<UsuarioList />} />
        <Route path="/usuarios/new" element={<UsuarioForm />} />
        <Route path="/usuarios/:id/edit" element={<UsuarioForm />} />

        {/* Sprint 9: Servicios y Dependencias */}
        <Route path="/dependencias" element={<DependenciaList />} />
        <Route path="/dependencias/new" element={<DependenciaForm />} />
        <Route path="/dependencias/:id/edit" element={<DependenciaForm />} />

        <Route path="/servicios" element={<ServicioList />} />
        <Route path="/servicios/new" element={<ServicioForm />} />
        <Route path="/servicios/:id/edit" element={<ServicioForm />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TutorialProvider>
            <AppRoutes />
          </TutorialProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SessionProvider } from './context/SessionContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AvatarSession from './pages/AvatarSession';
import NuevaTutela from './pages/NuevaTutela';
import MisCasos from './pages/MisCasos';
import Perfil from './pages/Perfil';
import PagoExitoso from './pages/PagoExitoso';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReembolsos from './pages/admin/AdminReembolsos';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SessionProvider>
          <Routes>
            {/* Redirección de la raíz a login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Rutas de administración */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/reembolsos"
              element={
                <ProtectedAdminRoute>
                  <AdminReembolsos />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Rutas protegidas */}
            <Route
              path="/app/avatar"
              element={
                <ProtectedRoute>
                  <AvatarSession />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/tutela/:casoId"
              element={
                <ProtectedRoute>
                  <NuevaTutela />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/casos"
              element={
                <ProtectedRoute>
                  <MisCasos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/pago-exitoso"
              element={
                <ProtectedRoute>
                  <PagoExitoso />
                </ProtectedRoute>
              }
            />

            {/* Ruta principal post-login: AvatarSession (según plan.md) */}
            <Route path="/app" element={<Navigate to="/app/avatar" replace />} />

            {/* Ruta 404 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </SessionProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

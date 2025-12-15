import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AppDashboard from './pages/AppDashboard';
import AvatarSession from './pages/AvatarSession';
import NuevaTutela from './pages/NuevaTutela';
import MisCasos from './pages/MisCasos';
import Perfil from './pages/Perfil';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redirección de la raíz a login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Rutas protegidas */}
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/avatar"
            element={
              <ProtectedRoute>
                <AvatarSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/tutela/nueva"
            element={
              <ProtectedRoute>
                <NuevaTutela />
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
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

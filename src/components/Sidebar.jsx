import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NivelUsuario from './NivelUsuario';
import UsoSesiones from './UsoSesiones';
import { casoService } from '../services/casoService';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [tieneNovedades, setTieneNovedades] = useState(false);

  // Ocultar sidebar automáticamente en la ruta de avatar
  const isAvatarRoute = location.pathname === '/app/avatar';

  useEffect(() => {
    if (isAvatarRoute) {
      setIsExpanded(false);
    }
  }, [isAvatarRoute]);

  // 🔔 Polling para verificar novedades cada 60 segundos
  useEffect(() => {
    const verificarNovedades = async () => {
      try {
        const response = await casoService.tieneNovedades();
        setTieneNovedades(response.tiene_novedades);
      } catch (error) {
        console.error('Error verificando novedades:', error);
      }
    };

    // Verificar inmediatamente al montar
    verificarNovedades();

    // Configurar polling cada 60 segundos
    const intervalo = setInterval(verificarNovedades, 60000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalo);
  }, []);

  // ✅ Actualizar inmediatamente al entrar a "Mis Casos"
  useEffect(() => {
    if (location.pathname === '/app/casos') {
      // Esperar un poquito para que MisCasos marque como vistos primero
      const timer = setTimeout(async () => {
        try {
          const response = await casoService.tieneNovedades();
          setTieneNovedades(response.tiene_novedades);
        } catch (error) {
          console.error('Error verificando novedades:', error);
        }
      }, 500); // 500ms de delay

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Definir items base del menú
  const baseMenuItems = [
    {
      name: 'Inicio',
      path: '/app/avatar',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Mis Casos',
      path: '/app/casos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
  ];

  // Agregar opción de Administración si el usuario es admin
  const menuItems = user?.is_admin
    ? [
        ...baseMenuItems,
        {
          name: 'Administración',
          path: '/admin/dashboard',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          isAdmin: true,
        },
      ]
    : baseMenuItems;

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (!user?.nombre) return 'U';
    const names = user.nombre.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.nombre.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 ease-in-out animate-fadeIn"
      style={{
        width: isExpanded ? '16rem' : '5rem',
        backgroundColor: 'white',
        borderRight: '1px solid var(--neutral-300)',
      }}
      role="navigation"
      aria-label="Navegación principal"
    >
      {/* Header - Logo */}
      <div className="flex items-center justify-between px-4 py-6 border-b" style={{ borderColor: 'var(--neutral-300)' }}>
        {isExpanded && (
          <div className="flex items-center gap-2">
            <img
              src="/assets/logo.png"
              alt="Abogadai Logo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight">
              <span style={{ color: '#1a1a1a' }}>Abogad</span>
              <span style={{ color: '#0b6dff' }}>ai</span>
            </h1>
          </div>
        )}
        {!isExpanded && (
          <img
            src="/assets/logo.png"
            alt="Abogadai Logo"
            className="w-9 h-9 object-contain mx-auto"
          />
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md transition-colors"
          style={{ color: 'var(--neutral-500)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
            e.currentTarget.style.color = 'var(--neutral-800)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--neutral-500)';
          }}
          title={isExpanded ? 'Contraer menú' : 'Expandir menú'}
          aria-label={isExpanded ? 'Contraer menú' : 'Expandir menú'}
          aria-expanded={isExpanded}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="px-3 py-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200"
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'white' : 'var(--neutral-600)',
              position: 'relative', // Para que el punto absoluto funcione
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
                e.currentTarget.style.color = 'var(--neutral-800)';
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--neutral-600)';
              }
            }}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            {isExpanded && (
              <span className="font-medium text-sm flex items-center gap-2">
                {item.name}
                {/* 🔴 Punto rojo de notificación para "Mis Casos" */}
                {item.name === 'Mis Casos' && tieneNovedades && (
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#ef4444' }}
                    title="Tienes novedades sin ver"
                  />
                )}
              </span>
            )}
            {/* 🔴 Punto rojo cuando está colapsado */}
            {!isExpanded && item.name === 'Mis Casos' && tieneNovedades && (
              <span
                className="absolute w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: '#ef4444',
                  top: '0.75rem',
                  right: '0.75rem',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                  zIndex: 10
                }}
                title="Tienes novedades sin ver"
              />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Mi Uso Section - Solo visible cuando está expandido */}
      {isExpanded ? (
        <div className="flex-1 px-3 pb-2" style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--neutral-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            paddingLeft: 'var(--spacing-xs)',
          }}>
            Mi Uso
          </h3>
          <NivelUsuario variant="sidebar" />
          <UsoSesiones variant="sidebar" />
        </div>
      ) : (
        // Spacer para empujar User Section hacia abajo cuando está colapsado
        <div className="flex-1"></div>
      )}

      {/* User Section */}
      <div className="border-t p-4" style={{ borderColor: 'var(--neutral-300)' }}>
        {isExpanded ? (
          <div className="space-y-3">
            {/* User Info - Clickeable para ir al perfil */}
            <button
              onClick={() => navigate('/app/perfil')}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200"
              style={{ backgroundColor: 'transparent', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
                e.currentTarget.style.transform = 'translateX(2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              title="Ver mi perfil"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--neutral-800)' }}>
                  {user?.nombre || 'Usuario'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--neutral-500)' }}>
                  {user?.email || ''}
                </p>
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
              style={{ color: 'var(--neutral-600)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
                e.currentTarget.style.color = 'var(--neutral-800)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--neutral-600)';
              }}
              aria-label="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* User Avatar - Clickeable para ir al perfil */}
            <button
              onClick={() => navigate('/app/perfil')}
              className="p-0 rounded-full transition-all duration-200"
              style={{ backgroundColor: 'transparent', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(11, 109, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Ver mi perfil"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {getUserInitials()}
              </div>
            </button>

            {/* Logout Icon */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition-all duration-200"
              style={{ color: 'var(--neutral-600)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
                e.currentTarget.style.color = 'var(--neutral-800)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--neutral-600)';
              }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

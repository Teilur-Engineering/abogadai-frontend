import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import Button from '../components/Button';
import Input from '../components/Input';
import { trackEvent } from '../utils/analytics';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailNoVerificado, setEmailNoVerificado] = useState(false);
  const [reenvioLoading, setReenvioLoading] = useState(false);

  // Mostrar toast si llega con ?verificado=true o ?verificado=error
  useEffect(() => {
    const verificado = searchParams.get('verificado');
    if (verificado === 'true') {
      toast.success('¡Email verificado! Ya puedes iniciar sesión.');
    } else if (verificado === 'error') {
      toast.error('El enlace de verificación es inválido o ha expirado.');
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (emailNoVerificado) setEmailNoVerificado(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmailNoVerificado(false);

    try {
      await login(formData);
      trackEvent('login_complete');
      toast.success('Inicio de sesión exitoso');

      // Marcar que acaba de hacer login para reproducir video de bienvenida
      sessionStorage.setItem('justLoggedIn', 'true');

      // Verificar si hay una URL guardada para redirigir
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectUrl);
      } else {
        navigate('/app');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setEmailNoVerificado(true);
      } else {
        toast.error(detail || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarVerificacion = async () => {
    if (!formData.email) {
      toast.error('Ingresa tu email para reenviar la verificación');
      return;
    }
    setReenvioLoading(true);
    try {
      await authService.resendVerification(formData.email);
      toast.success('Enlace de verificación enviado. Revisa tu bandeja de entrada.');
    } catch (_) {
      toast.error('Error al reenviar el enlace. Inténtalo más tarde.');
    } finally {
      setReenvioLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 animate-fadeIn"
      style={{
        background: 'linear-gradient(135deg, var(--neutral-900) 0%, var(--color-primary) 100%)',
      }}
    >
      <div
        className="max-w-md w-full space-y-8 p-8 rounded-2xl shadow-2xl animate-slideUp"
        style={{
          backgroundColor: 'white',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Logo y Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/assets/logo.png"
              alt="Abogadai Logo"
              className="w-16 h-16 object-contain"
            />
            <h1 className="text-4xl font-bold tracking-tight">
              <span style={{ color: '#1a1a1a' }}>Abogad</span>
              <span style={{ color: '#0b6dff' }}>ai</span>
            </h1>
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--neutral-600)' }}
          >
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              leftIcon={
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <Input
              label="Contraseña"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              leftIcon={
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
            />
          </div>

          {/* Banner: email no verificado */}
          {emailNoVerificado && (
            <div
              className="rounded-lg p-4 text-sm"
              style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b' }}
            >
              <p style={{ color: '#92400e', fontWeight: '600', marginBottom: '8px' }}>
                Por favor verifica tu email antes de iniciar sesión.
              </p>
              <p style={{ color: '#78350f', marginBottom: '12px' }}>
                Revisa tu bandeja de entrada (y la carpeta de spam).
              </p>
              <button
                type="button"
                onClick={handleReenviarVerificacion}
                disabled={reenvioLoading}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: '600',
                  cursor: reenvioLoading ? 'not-allowed' : 'pointer',
                  opacity: reenvioLoading ? 0.7 : 1,
                }}
              >
                {reenvioLoading ? 'Enviando...' : 'Reenviar enlace de verificación'}
              </button>
            </div>
          )}

          <div className="space-y-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>

            <div className="text-center text-sm">
              <Link
                to="/forgot-password"
                style={{
                  color: 'var(--neutral-500)',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-sm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--neutral-500)';
                }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="text-center text-sm">
              <span style={{ color: 'var(--neutral-600)' }}>
                ¿No tienes cuenta?{' '}
              </span>
              <Link
                to="/signup"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: 'var(--font-weight-medium)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Regístrate aquí
              </Link>
            </div>
          </div>
        </form>

        {/* Footer decorativo */}
        <div className="pt-6 border-t" style={{ borderColor: 'var(--neutral-300)' }}>
          <p
            className="text-xs text-center"
            style={{ color: 'var(--neutral-500)' }}
          >
            Tu asistente legal inteligente
          </p>
        </div>
      </div>
    </div>
  );
}

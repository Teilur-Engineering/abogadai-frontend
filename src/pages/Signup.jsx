import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { trackEvent } from '../utils/analytics';

export default function Signup() {
  const { signup } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    apellido: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Tracking: usuario llegó a la página de registro
  useEffect(() => {
    trackEvent('signup_start');
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      await signup(signupData);
      trackEvent('signup_complete');
      setEnviado(true);
    } catch (err) {
      trackEvent('signup_error', { error_message: err.response?.data?.detail || 'Error desconocido' });
      toast.error(err.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de confirmación tras registro exitoso
  if (enviado) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 animate-fadeIn"
        style={{
          background: 'linear-gradient(135deg, var(--neutral-900) 0%, var(--color-primary) 100%)',
        }}
      >
        <div
          className="max-w-md w-full space-y-8 p-8 rounded-2xl shadow-2xl animate-slideUp text-center"
          style={{
            backgroundColor: 'white',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
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

          <div
            className="rounded-full flex items-center justify-center mx-auto"
            style={{
              width: '72px',
              height: '72px',
              backgroundColor: '#dcfce7',
            }}
          >
            <svg width="36" height="36" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>
            Revisa tu email
          </h2>

          <p style={{ color: 'var(--neutral-600)', lineHeight: '1.6' }}>
            Te enviamos un enlace de verificación a{' '}
            <strong>{formData.email}</strong>.
            <br />
            Haz clic en el enlace para activar tu cuenta.
          </p>

          <p className="text-sm" style={{ color: 'var(--neutral-500)' }}>
            ¿No lo ves? Revisa la carpeta de spam.
          </p>

          <div className="pt-4">
            <Link
              to="/login"
              style={{
                color: 'var(--color-primary)',
                fontWeight: 'var(--font-weight-medium)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 animate-fadeIn"
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
            Crea tu cuenta gratis
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Juan"
                required
                fullWidth
              />

              <Input
                label="Apellido"
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Pérez"
                required
                fullWidth
              />
            </div>

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
              helpText="Mínimo 6 caracteres"
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

            <Input
              label="Confirmar contraseña"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              success={formData.confirmPassword && formData.password === formData.confirmPassword ? 'Las contraseñas coinciden' : undefined}
              error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Las contraseñas no coinciden' : undefined}
              leftIcon={
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>

            <div className="text-center text-sm">
              <span style={{ color: 'var(--neutral-600)' }}>
                ¿Ya tienes cuenta?{' '}
              </span>
              <Link
                to="/login"
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
                Inicia sesión
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

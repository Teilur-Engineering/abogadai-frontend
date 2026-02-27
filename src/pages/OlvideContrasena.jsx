import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import Button from '../components/Button';
import Input from '../components/Input';

export default function OlvideContrasena() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      setEnviado(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
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
          <p className="text-sm" style={{ color: 'var(--neutral-600)' }}>
            Recupera el acceso a tu cuenta
          </p>
        </div>

        {enviado ? (
          /* Estado: email enviado */
          <div className="space-y-6 text-center">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full mx-auto"
              style={{ backgroundColor: '#dcfce7' }}
            >
              <svg
                width="32"
                height="32"
                fill="none"
                stroke="#16a34a"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: 'var(--neutral-800)' }}
              >
                Revisa tu email
              </h2>
              <p className="text-sm" style={{ color: 'var(--neutral-600)' }}>
                Si el email <strong>{email}</strong> está registrado, recibirás
                un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <p
                className="text-xs mt-3"
                style={{ color: 'var(--neutral-500)' }}
              >
                El enlace expira en 1 hora. Revisa también la carpeta de spam.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block text-sm font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          /* Formulario */
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--neutral-600)' }}>
                Ingresa el email de tu cuenta y te enviaremos un enlace para
                crear una nueva contraseña.
              </p>
              <Input
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                error={error}
                leftIcon={
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
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
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>

              <div className="text-center text-sm">
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
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </form>
        )}

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

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import Button from '../components/Button';
import Input from '../components/Input';

export default function RestablecerContrasena() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    new_password: '',
    confirmar_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [exitoso, setExitoso] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Limpiar error del campo al escribir
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validar = () => {
    const nuevos = {};
    if (formData.new_password.length < 8) {
      nuevos.new_password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (formData.new_password !== formData.confirmar_password) {
      nuevos.confirmar_password = 'Las contraseñas no coinciden';
    }
    setErrors(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setLoading(true);
    setErrors({});

    try {
      await authService.resetPassword(token, formData.new_password);
      setExitoso(true);
      // Redirigir al login tras 3 segundos
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Ocurrió un error. Intenta de nuevo.';
      setErrors({ general: detail });
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
            Crea una nueva contraseña
          </p>
        </div>

        {exitoso ? (
          /* Estado: contraseña cambiada */
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: 'var(--neutral-800)' }}
              >
                ¡Contraseña actualizada!
              </h2>
              <p className="text-sm" style={{ color: 'var(--neutral-600)' }}>
                Tu contraseña ha sido restablecida exitosamente.
                Serás redirigido al inicio de sesión en unos segundos.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block text-sm font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              Ir al inicio de sesión →
            </Link>
          </div>
        ) : (
          /* Formulario */
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: '#fef2f2',
                  color: 'var(--color-error)',
                  border: '1px solid #fecaca',
                }}
              >
                {errors.general}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Nueva contraseña"
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                required
                error={errors.new_password}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                }
              />

              <Input
                label="Confirmar contraseña"
                type="password"
                name="confirmar_password"
                value={formData.confirmar_password}
                onChange={handleChange}
                placeholder="Repite la contraseña"
                required
                error={errors.confirmar_password}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
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
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
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

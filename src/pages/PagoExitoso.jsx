import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import api from '../services/api';
import { trackEvent } from '../utils/analytics';

/**
 * PagoExitoso - Página de confirmación de pago exitoso
 *
 * Muestra:
 * - Confirmación de pago
 * - Documento desbloqueado
 * - Beneficios obtenidos:
 *   - +2 sesiones extra HOY
 *   - Nivel actualizado (si subió)
 *   - Nuevos límites del nivel
 * - Botón para descargar documento
 *
 * @component
 */
export default function PagoExitoso() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const casoId = searchParams.get('caso_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [beneficios, setBeneficios] = useState(null);
  const [caso, setCaso] = useState(null);

  useEffect(() => {
    if (!casoId) {
      setError('No se especificó el caso');
      setLoading(false);
      return;
    }

    cargarDatosPago();
  }, [casoId]);

  const cargarDatosPago = async () => {
    try {
      setLoading(true);

      // Obtener información del caso
      const responseCaso = await api.get(`/casos/${casoId}`);
      setCaso(responseCaso.data);
      trackEvent('payment_success_page_view', { case_id: casoId, document_type: responseCaso.data?.tipo_documento });

      // Obtener beneficios del pago
      // Esta información podría venir de:
      // 1. Response del pago (si se guardó en sessionStorage)
      // 2. API endpoint específico
      // 3. Calcularse en base al nivel del usuario

      const beneficiosGuardados = sessionStorage.getItem(`pago_${casoId}`);
      if (beneficiosGuardados) {
        setBeneficios(JSON.parse(beneficiosGuardados));
        sessionStorage.removeItem(`pago_${casoId}`);
      } else {
        // Si no hay beneficios guardados, obtener el nivel actual
        const responseNivel = await api.get('/usuarios/mi-nivel');
        setBeneficios({
          sesiones_extra: 2,
          nivel_anterior: null,
          nivel_nuevo: responseNivel.data.nivel_actual,
          nivel_subio: false,
          nuevo_limite_sesiones: responseNivel.data.sesiones_maximas,
          nuevo_limite_minutos: responseNivel.data.minutos_maximos,
        });
      }

      setError(null);
    } catch (err) {
      console.error('Error cargando datos del pago:', err);
      setError('No se pudo cargar la información del pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarDocumento = async () => {
    try {
      const response = await api.get(`/casos/${casoId}/descargar`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documento_${casoId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error descargando documento:', err);
      alert('Error al descargar el documento');
    }
  };

  const handleIrACasos = () => {
    navigate('/app/casos');
  };

  const handleIniciarNuevaSesion = () => {
    navigate('/app/avatar');
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--neutral-200)' }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--color-primary)' }}
          ></div>
          <p style={{ color: 'var(--neutral-600)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !caso) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--neutral-200)' }}
      >
        <div
          className="rounded-lg p-8 max-w-md text-center"
          style={{ backgroundColor: 'white', border: '1px solid var(--neutral-300)' }}
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--neutral-800)' }}
          >
            {error || 'Error'}
          </h2>
          <Button variant="primary" onClick={() => navigate('/app/casos')} fullWidth>
            Ir a Mis Casos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-12"
      style={{ backgroundColor: 'var(--neutral-200)' }}
    >
      <div className="max-w-4xl mx-auto px-4">
        {/* Header de éxito */}
        <div
          className="rounded-xl p-8 mb-6 text-center animate-fadeIn"
          style={{
            background: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%)',
            boxShadow: 'var(--shadow-xl)',
            color: 'white',
          }}
        >
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h1 className="text-4xl font-bold mb-2">¡Pago Exitoso!</h1>
          <p className="text-xl opacity-90">
            Tu documento ha sido desbloqueado correctamente
          </p>
        </div>

        {/* Información del documento */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ backgroundColor: 'white', boxShadow: 'var(--shadow-md)' }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--neutral-800)' }}
          >
            Documento Desbloqueado
          </h2>
          <div
            className="space-y-2 text-sm"
            style={{ color: 'var(--neutral-600)' }}
          >
            <p>
              <strong style={{ color: 'var(--neutral-700)' }}>Caso:</strong>{' '}
              {caso.nombre_solicitante}
            </p>
            <p>
              <strong style={{ color: 'var(--neutral-700)' }}>Tipo:</strong>{' '}
              {caso.tipo_documento === 'tutela' ? 'Tutela' : 'Derecho de Petición'}
            </p>
          </div>

          <div className="mt-6">
            <Button
              variant="primary"
              onClick={handleDescargarDocumento}
              fullWidth
              leftIcon={
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Descargar Documento PDF
            </Button>
          </div>
        </div>

        {/* Beneficios desbloqueados */}
        {beneficios && (
          <div
            className="rounded-xl p-6 mb-6 animate-slideUp"
            style={{
              backgroundColor: 'white',
              boxShadow: 'var(--shadow-md)',
              animation: 'slideUp 0.5s ease-out 0.2s backwards',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">🎉</span>
              <h2
                className="text-2xl font-bold"
                style={{ color: 'var(--neutral-800)' }}
              >
                Beneficios Desbloqueados
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sesiones extra */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: '#f0fdf4',
                  borderColor: 'var(--color-success)',
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📱</span>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--neutral-800)' }}
                  >
                    Sesiones Extra HOY
                  </h3>
                </div>
                <p
                  className="text-3xl font-bold"
                  style={{ color: 'var(--color-success)' }}
                >
                  +{beneficios.sesiones_extra}
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--neutral-600)' }}
                >
                  Disponibles inmediatamente
                </p>
              </div>

              {/* Nivel actualizado */}
              {beneficios.nivel_subio && (
                <div
                  className="rounded-lg p-4 border-2"
                  style={{
                    backgroundColor: '#fffbeb',
                    borderColor: 'var(--color-warning)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">⬆️</span>
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: 'var(--neutral-800)' }}
                    >
                      ¡Nivel Mejorado!
                    </h3>
                  </div>
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    {beneficios.nivel_anterior} → {beneficios.nivel_nuevo}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--neutral-600)' }}
                  >
                    Has subido de nivel
                  </p>
                </div>
              )}

              {/* Nuevos límites */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: '#f0f9ff',
                  borderColor: 'var(--color-primary)',
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">⚡</span>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--neutral-800)' }}
                  >
                    Límite Diario
                  </h3>
                </div>
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {beneficios.nuevo_limite_sesiones} sesiones/día
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--neutral-600)' }}
                >
                  {beneficios.nuevo_limite_minutos} minutos por sesión
                </p>
              </div>

              {/* Garantía */}
              <div
                className="rounded-lg p-4 border-2"
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: '#fca5a5',
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">🛡️</span>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--neutral-800)' }}
                  >
                    Garantía
                  </h3>
                </div>
                <p className="text-sm" style={{ color: 'var(--neutral-700)' }}>
                  Si no estás satisfecho, puedes solicitar un reembolso desde
                  "Mis Casos"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="cta"
            onClick={handleIniciarNuevaSesion}
            fullWidth
            leftIcon={
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            Iniciar Nueva Sesión
          </Button>
          <Button
            variant="neutral"
            onClick={handleIrACasos}
            fullWidth
            leftIcon={
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          >
            Ver Mis Casos
          </Button>
        </div>

        {/* Tip */}
        <div
          className="mt-6 rounded-lg p-4"
          style={{
            backgroundColor: 'white',
            border: '1px solid var(--neutral-300)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3
                className="font-semibold mb-1"
                style={{ color: 'var(--neutral-800)' }}
              >
                Aprovecha tus sesiones extra
              </h3>
              <p className="text-sm" style={{ color: 'var(--neutral-600)' }}>
                Tienes {beneficios?.sesiones_extra || 2} sesiones adicionales disponibles solo
                por hoy. ¡Úsalas para crear más documentos legales!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Animaciones CSS */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

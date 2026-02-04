import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { casoService } from '../services/casoService';
import Button from './Button';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

// Detectar si estamos en modo desarrollo
const IS_DEVELOPMENT = import.meta.env.DEV || window.location.hostname === 'localhost';

/**
 * Procesa el texto markdown del documento y lo convierte a HTML con estilos
 */
const procesarDocumento = (texto) => {
  if (!texto) return '';

  const lineas = texto.split('\n');
  let html = '';

  lineas.forEach((linea) => {
    const lineaTrim = linea.trim();

    // Línea vacía
    if (!lineaTrim) {
      html += '<div style="height: 0.25rem;"></div>';
      return;
    }

    // Título principal (ACCIÓN DE TUTELA, DERECHO DE PETICIÓN)
    if (/^\*\*(ACCIÓN DE TUTELA|DERECHO DE PETICIÓN)\*\*$/i.test(lineaTrim)) {
      const texto = lineaTrim.replace(/\*\*/g, '');
      html += `<h1 style="text-align: center; font-size: 14pt; font-weight: bold; margin: 0.5rem 0 1rem 0; font-family: 'Times New Roman', serif;">${texto}</h1>`;
      return;
    }

    // Títulos de sección (I., II., III., etc.)
    if (/^\*\*([IVX]+\.)\s*.+\*\*$/i.test(lineaTrim)) {
      const texto = lineaTrim.replace(/\*\*/g, '');
      html += `<h2 style="font-size: 12pt; font-weight: bold; margin: 1rem 0 0.5rem 0; font-family: 'Times New Roman', serif;">${texto}</h2>`;
      return;
    }

    // Otras líneas con negrita completa
    if (/^\*\*.+\*\*$/.test(lineaTrim)) {
      const texto = lineaTrim.replace(/\*\*/g, '');
      // Si es mayúsculas o corto, es un subtítulo
      if (lineaTrim === lineaTrim.toUpperCase() || texto.length < 80) {
        html += `<p style="font-weight: bold; margin: 0.5rem 0; font-family: 'Times New Roman', serif; font-size: 11pt;">${texto}</p>`;
      } else {
        // Texto en negrita pero párrafo normal
        html += `<p style="text-align: justify; margin: 0.4rem 0; font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.6;"><strong>${texto}</strong></p>`;
      }
      return;
    }

    // Líneas de firma (guiones bajos)
    if (/^_{3,}$/.test(lineaTrim)) {
      html += `<p style="margin: 0.5rem 0; font-family: 'Times New Roman', serif; font-size: 11pt;">${lineaTrim}</p>`;
      return;
    }

    // Texto normal - procesar negrilla interna **texto**
    const textoConNegrilla = linea.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html += `<p style="text-align: justify; margin: 0.4rem 0; font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.6;">${textoConNegrilla}</p>`;
  });

  return html;
};

/**
 * 🔒 DocumentoViewer - Componente para mostrar documentos con sistema de preview/pago
 *
 * Funcionalidad:
 * - Muestra preview (15%) del documento si NO está pagado
 * - Muestra documento completo si está pagado
 * - Ofrece botón para simular pago (desarrollo)
 * - Habilita descarga solo si está pagado
 */
export default function DocumentoViewer({ casoId, onPagoExitoso }) {
  // Key para localStorage - definir primero para usar en inicialización
  const PAGO_EN_PROCESO_KEY = `pago_en_proceso_${String(casoId)}`;
  const TIEMPO_EXPIRACION = 30 * 60 * 1000; // 30 minutos en ms

  // Verificar URL y localStorage ANTES del primer render para inicializar correctamente
  const [verificandoPago, setVerificandoPago] = useState(() => {
    try {
      // PRIMERO: Verificar parámetros de URL (tienen prioridad)
      const urlParams = new URLSearchParams(window.location.search);
      const estadoPagoUrl = urlParams.get('pago');

      // Si Vita dice que falló (error/cancelado), NO entrar en modo verificación
      if (estadoPagoUrl === 'error' || estadoPagoUrl === 'cancelado') {
        localStorage.removeItem(`pago_en_proceso_${String(casoId)}`);
        return false;
      }

      // Si Vita dice exitoso o pendiente, SÍ verificar
      if (estadoPagoUrl === 'exitoso' || estadoPagoUrl === 'pendiente') {
        return true;
      }

      // SEGUNDO: Si no hay parámetro de URL, verificar localStorage
      const timestamp = localStorage.getItem(`pago_en_proceso_${String(casoId)}`);
      if (!timestamp) return false;
      const tiempoTranscurrido = Date.now() - parseInt(timestamp);
      if (tiempoTranscurrido < 30 * 60 * 1000) {
        // Hay un pago en proceso válido (30 minutos)
        return true;
      } else {
        // Expiró, limpiar
        localStorage.removeItem(`pago_en_proceso_${String(casoId)}`);
        return false;
      }
    } catch (e) {
      return false;
    }
  });

  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [mostrarOpcionesPago, setMostrarOpcionesPago] = useState(false);
  const [intentosVerificacion, setIntentosVerificacion] = useState(0);
  const [datosPago, setDatosPago] = useState({
    numeroTarjeta: '',
    fechaVencimiento: '',
    cvv: '',
    nombreTitular: ''
  });
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.is_admin || false;

  const MAX_INTENTOS_VERIFICACION = 600; // 600 intentos * 3 segundos = 30 minutos máximo
  const INTERVALO_VERIFICACION = 3000; // 3 segundos

  // Manejar parámetros de URL y mostrar mensajes correspondientes
  // NOTA: El estado verificandoPago ya se inicializó correctamente en useState
  useEffect(() => {
    const estadoPago = searchParams.get('pago');
    if (estadoPago) {
      // Limpiar URL para que no se muestre el parámetro
      window.history.replaceState({}, '', window.location.pathname);

      // Mostrar mensaje según el estado (el estado verificandoPago ya está correcto)
      if (estadoPago === 'cancelado') {
        // Cancelar pago pendiente en backend para permitir reintentar
        casoService.cancelarPagoPendiente(casoId).catch(err => {
          console.error('Error cancelando pago pendiente:', err);
        });
        toast.info('El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.');
      } else if (estadoPago === 'error') {
        // Cancelar pago pendiente en backend para permitir reintentar
        casoService.cancelarPagoPendiente(casoId).catch(err => {
          console.error('Error cancelando pago pendiente:', err);
        });
        toast.error('Hubo un error procesando el pago. Por favor intenta de nuevo.');
      } else if (estadoPago === 'exitoso') {
        toast.info('Verificando confirmación del pago...');
      } else if (estadoPago === 'pendiente') {
        toast.info('El pago está siendo procesado...');
      }
    }
  }, []);

  useEffect(() => {
    cargarDocumento();
  }, [casoId]);

  // Polling para verificar estado del pago
  useEffect(() => {
    let intervalId;

    if (verificandoPago && intentosVerificacion < MAX_INTENTOS_VERIFICACION) {
      intervalId = setInterval(async () => {
        try {
          const estado = await casoService.obtenerEstadoPago(casoId);

          if (estado.documento_desbloqueado || estado.estado === 'EXITOSO') {
            // Pago confirmado - limpiar localStorage
            localStorage.removeItem(PAGO_EN_PROCESO_KEY);
            setVerificandoPago(false);
            setIntentosVerificacion(0);
            toast.success('¡Pago confirmado! El documento ha sido desbloqueado.');
            cargarDocumento();
            if (onPagoExitoso) onPagoExitoso();
          } else if (estado.estado === 'FALLIDO') {
            // Pago falló - limpiar localStorage
            localStorage.removeItem(PAGO_EN_PROCESO_KEY);
            setVerificandoPago(false);
            setIntentosVerificacion(0);
            toast.error('El pago no pudo ser procesado. Por favor intenta de nuevo.');
          } else {
            // Sigue pendiente, incrementar intentos
            setIntentosVerificacion(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error verificando estado de pago:', error);
          setIntentosVerificacion(prev => prev + 1);
        }
      }, INTERVALO_VERIFICACION);
    } else if (intentosVerificacion >= MAX_INTENTOS_VERIFICACION) {
      // Tiempo agotado - NO limpiar localStorage, mantener verificandoPago en true
      // para que siga mostrando el mensaje de procesando (no el botón de pagar)
      setIntentosVerificacion(0); // Reiniciar contador para seguir intentando
      toast.info('La verificación está tardando más de lo esperado. Puedes recargar la página o seguir esperando.');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [verificandoPago, intentosVerificacion, casoId]);

  const cargarDocumento = async () => {
    try {
      setLoading(true);
      const data = await casoService.obtenerDocumento(casoId);
      setDocumento(data);
    } catch (error) {
      console.error('Error al cargar documento:', error);
      toast.error('Error al cargar el documento');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear número de tarjeta (agregar espacios cada 4 dígitos)
  const formatearNumeroTarjeta = (valor) => {
    const limpio = valor.replace(/\s/g, '').replace(/\D/g, '');
    const grupos = limpio.match(/.{1,4}/g);
    return grupos ? grupos.join(' ') : limpio;
  };

  // Función para formatear fecha MM/AA
  const formatearFecha = (valor) => {
    const limpio = valor.replace(/\D/g, '');
    if (limpio.length >= 2) {
      return limpio.slice(0, 2) + '/' + limpio.slice(2, 4);
    }
    return limpio;
  };

  // Pagar con Vita Wallet (producción)
  const handlePagarConVita = async () => {
    setProcesandoPago(true);

    try {
      const response = await casoService.iniciarPagoVita(casoId);

      if (response.payment_url) {
        // Guardar en localStorage que hay un pago en proceso
        // Esto sirve como backup si Vita no pasa los parámetros de URL
        localStorage.setItem(PAGO_EN_PROCESO_KEY, Date.now().toString());

        // Redirigir a Vita Wallet
        window.location.href = response.payment_url;
      } else {
        throw new Error('No se recibió URL de pago');
      }
    } catch (error) {
      console.error('Error iniciando pago con Vita:', error);
      const mensaje = error.response?.data?.detail || 'Error al conectar con la pasarela de pago';
      toast.error(mensaje);
      setProcesandoPago(false);
    }
  };

  // Desbloquear como administrador (sin pago real)
  const handleDesbloquearAdmin = async () => {
    setProcesandoPago(true);

    try {
      await casoService.desbloquearComoAdmin(casoId);
      await cargarDocumento();

      if (onPagoExitoso) {
        onPagoExitoso();
      }

      toast.success('Documento desbloqueado por administrador');
    } catch (error) {
      console.error('Error desbloqueando como admin:', error);
      const mensaje = error.response?.data?.detail || 'Error al desbloquear documento';
      toast.error(mensaje);
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const blob = await casoService.descargarPDF(casoId);
      const filename = `documento_${casoId}.pdf`;

      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Documento descargado como PDF');
    } catch (error) {
      console.error('Error al descargar:', error);
      const mensaje = error.response?.data?.detail || 'Error al descargar el documento';
      toast.error(mensaje);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">No se pudo cargar el documento</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Encabezado con estado del documento */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          {documento.preview ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-700 font-medium">Documento Bloqueado</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">Documento Desbloqueado</span>
            </div>
          )}
        </div>

        {/* Botón de descarga PDF - Solo cuando está desbloqueado */}
        {documento.descarga_habilitada && (
          <Button
            onClick={handleDescargarPDF}
            variant="primary"
            size="sm"
          >
            📥 Descargar PDF
          </Button>
        )}
      </div>

      {/* Contenedor del documento */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {documento.preview ? (
          <div className="relative">
            {/* Contenido visible (15%) */}
            <div
              className="p-8"
              dangerouslySetInnerHTML={{ __html: procesarDocumento(documento.contenido) }}
            />

            {/* Overlay con blur y call-to-action */}
            <div className="relative mt-8">
              {/* Contenido borroso de fondo */}
              <div
                className="blur-md select-none pointer-events-none opacity-40 p-8"
                dangerouslySetInnerHTML={{
                  __html: procesarDocumento(documento.contenido + '\n\n' + documento.contenido)
                }}
              />

              {/* Overlay central con llamado a la acción */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 border-2 border-blue-500 transform hover:scale-105 transition-transform">
                  {verificandoPago ? (
                    /* Estado de verificación de pago */
                    <>
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                            <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Procesando Pago
                        </h3>
                        <p className="text-gray-600 mb-1">
                          Estamos verificando tu pago con la pasarela
                        </p>
                        <p className="text-sm text-gray-500">
                          Esto puede tomar unos minutos...
                        </p>
                      </div>

                      {/* Mensaje informativo */}
                      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                        <p className="text-sm text-center text-blue-800">
                          El documento se desbloqueará automáticamente cuando se confirme el pago.
                        </p>
                      </div>

                      <p className="text-xs text-gray-500 text-center">
                        Puedes esperar aquí o volver más tarde. Si sales, el documento se desbloqueará cuando vuelvas (si el pago ya fue confirmado).
                      </p>
                    </>
                  ) : (
                    /* Estado normal - botón de pago */
                    <>
                      {/* Icono de candado */}
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Contenido Bloqueado
                        </h3>
                        <p className="text-gray-600 mb-1">
                          Desbloquea el documento completo
                        </p>
                        <p className="text-sm text-gray-500">
                          Actualmente viendo: 15% del documento
                        </p>
                      </div>

                      {/* Información del precio */}
                      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Precio del documento</p>
                          <p className="text-3xl font-bold text-blue-600">
                            ${documento.precio?.toLocaleString('es-CO')} <span className="text-lg text-gray-500">COP</span>
                          </p>
                        </div>
                      </div>

                      {/* Botón de pago */}
                      <Button
                        onClick={() => setMostrarOpcionesPago(true)}
                        variant="primary"
                        className="w-full"
                        disabled={procesandoPago}
                      >
                        {procesandoPago ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Procesando...
                          </span>
                        ) : (
                          'Desbloquear Documento'
                        )}
                      </Button>

                      {/* Botón de admin para desbloquear sin pago */}
                      {isAdmin && (
                        <Button
                          onClick={handleDesbloquearAdmin}
                          variant="secondary"
                          className="w-full mt-3 bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                          disabled={procesandoPago}
                        >
                          {procesandoPago ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-700"></div>
                              Desbloqueando...
                            </span>
                          ) : (
                            '🔓 Desbloquear (Admin)'
                          )}
                        </Button>
                      )}

                      {/* Beneficios */}
                      <div className="mt-6 space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Documento completo y profesional
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Descarga en PDF lista para imprimir
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Acceso permanente al documento
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Documento completo (ya desbloqueado)
          <div
            className="p-8"
            dangerouslySetInnerHTML={{ __html: procesarDocumento(documento.contenido) }}
          />
        )}
      </div>

      {/* Información adicional si está desbloqueado */}
      {!documento.preview && documento.fecha_pago && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Documento desbloqueado el{' '}
            {new Date(documento.fecha_pago).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}

      {/* Advertencia de preview */}
      {documento.preview && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Estás viendo solo una vista previa. El documento completo solo
            estará disponible después del pago.
          </p>
        </div>
      )}

      {/* Modal de Opciones de Pago */}
      {mostrarOpcionesPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scaleIn">
            {/* Botón cerrar */}
            <button
              onClick={() => setMostrarOpcionesPago(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={procesandoPago}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Desbloquear Documento</h2>
              <p className="text-gray-600">Elige tu método de pago preferido</p>
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">
                  {documento?.tipo_documento === 'TUTELA' ? 'Acción de Tutela' : 'Derecho de Petición'}
                </span>
                <span className="font-semibold text-gray-900">
                  ${documento?.precio?.toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>

            {/* Opciones de pago */}
            <div className="space-y-3">
              {/* Vita Wallet - Opción principal */}
              <button
                onClick={handlePagarConVita}
                disabled={procesandoPago}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
              >
                {procesandoPago ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Conectando con pasarela...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pagar con Vita Wallet
                  </>
                )}
              </button>

              {/* Métodos disponibles */}
              <div className="flex items-center justify-center gap-4 py-2">
                <span className="text-xs text-gray-500">Nequi</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">PSE</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">Bancolombia</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">Daviplata</span>
              </div>

            </div>

            {/* Seguridad */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pago seguro procesado por Vita Wallet
            </div>
          </div>
        </div>
      )}


      {/* Modal de Pasarela de Pago Simulada */}
      {mostrarModalPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-scaleIn">
            {/* Botón cerrar */}
            <button
              onClick={() => setMostrarModalPago(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={procesandoPago}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pasarela de Pago</h2>
              <p className="text-sm text-gray-500">(Simulación - Ambiente de desarrollo)</p>
            </div>

            {/* Resumen de compra */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">
                  {documento?.tipo_documento === 'TUTELA' ? 'Acción de Tutela' : 'Derecho de Petición'}
                </span>
                <span className="font-semibold text-gray-900">
                  ${documento?.precio?.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="font-semibold text-gray-900">Total a pagar</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${documento?.precio?.toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>

            {/* Formulario de pago simulado */}
            <form onSubmit={handleSimularPago} className="space-y-4">
              {/* Número de tarjeta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de tarjeta
                </label>
                <input
                  type="text"
                  placeholder="4111 1111 1111 1111"
                  value={datosPago.numeroTarjeta}
                  onChange={(e) => setDatosPago({...datosPago, numeroTarjeta: formatearNumeroTarjeta(e.target.value)})}
                  maxLength={19}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={procesandoPago}
                />
              </div>

              {/* Fecha y CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    value={datosPago.fechaVencimiento}
                    onChange={(e) => setDatosPago({...datosPago, fechaVencimiento: formatearFecha(e.target.value)})}
                    maxLength={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={procesandoPago}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={datosPago.cvv}
                    onChange={(e) => setDatosPago({...datosPago, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                    maxLength={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={procesandoPago}
                  />
                </div>
              </div>

              {/* Nombre del titular */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del titular
                </label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={datosPago.nombreTitular}
                  onChange={(e) => setDatosPago({...datosPago, nombreTitular: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={procesandoPago}
                />
              </div>

              {/* Nota de simulación */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800 text-center">
                  ℹ️ Este es un pago simulado. Cualquier dato que ingreses será aceptado.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalPago(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                  disabled={procesandoPago}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoPago}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {procesandoPago ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </span>
                  ) : (
                    'Pagar Ahora'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

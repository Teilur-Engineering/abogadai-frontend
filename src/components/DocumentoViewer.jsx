import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { casoService } from '../services/casoService';
import Button from './Button';
import { useToast } from '../context/ToastContext';

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
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [mostrarOpcionesPago, setMostrarOpcionesPago] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [intentosVerificacion, setIntentosVerificacion] = useState(0);
  const [datosPago, setDatosPago] = useState({
    numeroTarjeta: '',
    fechaVencimiento: '',
    cvv: '',
    nombreTitular: ''
  });
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Ref para evitar procesar el pago múltiples veces
  const pagoProcessedRef = useRef(false);

  const MAX_INTENTOS_VERIFICACION = 30; // 30 intentos * 3 segundos = 90 segundos máximo
  const INTERVALO_VERIFICACION = 3000; // 3 segundos

  // Key para localStorage del pago en proceso
  const PAGO_EN_PROCESO_KEY = `pago_en_proceso_${casoId}`;

  // Verificar si hay pago en proceso al montar el componente
  useEffect(() => {
    // Evitar procesamiento múltiple
    if (pagoProcessedRef.current) return;

    // 1. Primero verificar parámetro de URL (si Vita lo pasa)
    const estadoPago = searchParams.get('pago');

    // 2. También verificar localStorage (backup si Vita no pasa parámetro)
    const pagoEnProcesoTimestamp = localStorage.getItem(PAGO_EN_PROCESO_KEY);

    // Verificar si el pago en localStorage no ha expirado (10 minutos máximo)
    const TIEMPO_EXPIRACION = 10 * 60 * 1000; // 10 minutos en ms
    let pagoEnProcesoValido = false;
    if (pagoEnProcesoTimestamp) {
      const tiempoTranscurrido = Date.now() - parseInt(pagoEnProcesoTimestamp);
      if (tiempoTranscurrido < TIEMPO_EXPIRACION) {
        pagoEnProcesoValido = true;
      } else {
        // Expiró, limpiar
        localStorage.removeItem(PAGO_EN_PROCESO_KEY);
      }
    }

    if (estadoPago || pagoEnProcesoValido) {
      pagoProcessedRef.current = true;

      // Limpiar query params de la URL
      if (estadoPago) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      // Determinar acción basada en el estado
      const estado = estadoPago || 'pendiente'; // Si viene de localStorage, asumir pendiente

      switch (estado) {
        case 'exitoso':
        case 'pendiente':
          // Iniciar verificación (el localStorage se limpia cuando confirma/falla)
          iniciarVerificacionPago();
          break;
        case 'cancelado':
          localStorage.removeItem(PAGO_EN_PROCESO_KEY);
          toast.info('El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.');
          break;
        case 'error':
          localStorage.removeItem(PAGO_EN_PROCESO_KEY);
          toast.error('Hubo un error procesando el pago. Por favor intenta de nuevo.');
          break;
      }
    }
  }, [casoId, searchParams, toast, PAGO_EN_PROCESO_KEY]);

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
      // Tiempo agotado - NO limpiar localStorage para que pueda reintentar al recargar
      setVerificandoPago(false);
      setIntentosVerificacion(0);
      toast.warning('La verificación del pago está tomando más tiempo de lo esperado. Por favor recarga la página en unos minutos.');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [verificandoPago, intentosVerificacion, casoId, PAGO_EN_PROCESO_KEY]);

  // Iniciar verificación de pago con modal
  const iniciarVerificacionPago = () => {
    setVerificandoPago(true);
    setIntentosVerificacion(0);
  };

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

  // Simular pago (solo desarrollo)
  const handleSimularPago = async (e) => {
    e.preventDefault();

    // Simular delay de procesamiento (1.5 segundos)
    setProcesandoPago(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Llamar al endpoint de simulación de pago
      await casoService.simularPago(casoId);

      // Cerrar modal
      setMostrarModalPago(false);

      // Recargar documento para mostrar versión completa
      await cargarDocumento();

      // Notificar al componente padre si existe callback
      if (onPagoExitoso) {
        onPagoExitoso();
      }

      // Mostrar mensaje de éxito
      toast.success('¡Pago procesado exitosamente! El documento ha sido desbloqueado.');

      // Limpiar formulario
      setDatosPago({
        numeroTarjeta: '',
        fechaVencimiento: '',
        cvv: '',
        nombreTitular: ''
      });

    } catch (error) {
      console.error('Error al simular pago:', error);
      const mensaje = error.response?.data?.detail || 'Error al procesar el pago';
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
                          Verificando Pago
                        </h3>
                        <p className="text-gray-600 mb-1">
                          Estamos confirmando tu pago con la pasarela
                        </p>
                        <p className="text-sm text-gray-500">
                          Esto puede tomar unos segundos...
                        </p>
                      </div>

                      {/* Barra de progreso */}
                      <div className="bg-gray-100 rounded-lg p-4 mb-4">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(intentosVerificacion / MAX_INTENTOS_VERIFICACION) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-center text-gray-600">
                          {intentosVerificacion < MAX_INTENTOS_VERIFICACION
                            ? `Verificando... (${Math.round((intentosVerificacion / MAX_INTENTOS_VERIFICACION) * 100)}%)`
                            : 'Finalizando...'}
                        </p>
                      </div>

                      <p className="text-xs text-gray-500 text-center">
                        No cierres esta ventana mientras verificamos tu pago
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

              {/* Separador con opción de desarrollo */}
              {IS_DEVELOPMENT && (
                <>
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">o en modo desarrollo</span>
                    </div>
                  </div>

                  {/* Botón de simulación (solo desarrollo) */}
                  <button
                    onClick={() => {
                      setMostrarOpcionesPago(false);
                      setMostrarModalPago(true);
                    }}
                    disabled={procesandoPago}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50 border border-gray-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Simular Pago (Dev)
                    </span>
                  </button>
                </>
              )}
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

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import casoService from '../services/casoService';
import api from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import AnalisisDocumento from '../components/AnalisisDocumento';
import { FieldValidationMessages, ValidationSummary } from '../components/ValidationMessage';

export default function NuevaTutela() {
  const { casoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const modoVista = searchParams.get('mode') === 'view';
  const [guardando, setGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [documentoGenerado, setDocumentoGenerado] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const autoGuardadoRef = useRef(null);
  const [caso, setCaso] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  // Estados para datos de referencia colombianos
  const [derechosFundamentales, setDerechosFundamentales] = useState([]);
  const [entidadesPublicas, setEntidadesPublicas] = useState([]);
  const [erroresValidacion, setErroresValidacion] = useState({});

  const [formData, setFormData] = useState({
    tipo_documento: 'tutela', // 'tutela' | 'derecho_peticion'
    nombre_solicitante: '',
    identificacion_solicitante: '',
    direccion_solicitante: '',
    telefono_solicitante: '',
    email_solicitante: '',
    actua_en_representacion: false,
    nombre_representado: '',
    identificacion_representado: '',
    relacion_representado: '',
    tipo_representado: '',
    entidad_accionada: '',
    direccion_entidad: '',
    hechos: '',
    ciudad_de_los_hechos: '',
    derechos_vulnerados: '',
    pretensiones: '',
    fundamentos_derecho: '',
    pruebas: '',
  });

  // Cargar datos de referencia al montar el componente
  useEffect(() => {
    cargarDatosReferencia();
  }, []);

  // Cargar caso existente si hay casoId
  useEffect(() => {
    if (casoId) {
      cargarCaso();
    }
  }, [casoId]);

  // Pre-llenar con datos del perfil si es caso nuevo
  useEffect(() => {
    if (!casoId && user) {
      prellenarDatosDesdePerfil();
    }
  }, [casoId, user]);

  const prellenarDatosDesdePerfil = async () => {
    try {
      const response = await api.get('/casos/prellenar-datos');
      const datosPerfil = response.data;

      setFormData(prev => ({
        ...prev,
        nombre_solicitante: datosPerfil.nombre_solicitante || prev.nombre_solicitante,
        email_solicitante: datosPerfil.email_solicitante || prev.email_solicitante,
        identificacion_solicitante: datosPerfil.identificacion_solicitante || prev.identificacion_solicitante,
        direccion_solicitante: datosPerfil.direccion_solicitante || prev.direccion_solicitante,
        telefono_solicitante: datosPerfil.telefono_solicitante || prev.telefono_solicitante
      }));
    } catch (error) {
      console.error('Error pre-llenando datos:', error);
    }
  };

  const cargarDatosReferencia = async () => {
    try {
      // Cargar derechos fundamentales
      const derechosRes = await api.get('/api/referencias/derechos-fundamentales');
      setDerechosFundamentales(derechosRes.data.derechos || []);

      // Cargar entidades públicas (todas las categorías)
      const entidadesRes = await api.get('/api/referencias/entidades-publicas');
      const todasEntidades = [];
      if (entidadesRes.data.categorias) {
        Object.values(entidadesRes.data.categorias).forEach(categoria => {
          todasEntidades.push(...categoria);
        });
      }
      setEntidadesPublicas(todasEntidades.sort());
    } catch (error) {
      console.error('Error cargando datos de referencia:', error);
    }
  };

  const cargarCaso = async () => {
    try {
      const casoData = await casoService.obtenerCaso(casoId);
      setCaso(casoData);
      setFormData({
        tipo_documento: casoData.tipo_documento || 'tutela',
        nombre_solicitante: casoData.nombre_solicitante || '',
        identificacion_solicitante: casoData.identificacion_solicitante || '',
        direccion_solicitante: casoData.direccion_solicitante || '',
        telefono_solicitante: casoData.telefono_solicitante || '',
        email_solicitante: casoData.email_solicitante || '',
        actua_en_representacion: casoData.actua_en_representacion || false,
        nombre_representado: casoData.nombre_representado || '',
        identificacion_representado: casoData.identificacion_representado || '',
        relacion_representado: casoData.relacion_representado || '',
        tipo_representado: casoData.tipo_representado || '',
        entidad_accionada: casoData.entidad_accionada || '',
        direccion_entidad: casoData.direccion_entidad || '',
        hechos: casoData.hechos || '',
        ciudad_de_los_hechos: casoData.ciudad_de_los_hechos || '',
        derechos_vulnerados: casoData.derechos_vulnerados || '',
        pretensiones: casoData.pretensiones || '',
        fundamentos_derecho: casoData.fundamentos_derecho || '',
        pruebas: casoData.pruebas || '',
      });
      setDocumentoGenerado(casoData.documento_generado || '');
    } catch (error) {
      console.error('Error cargando caso:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpiar error de validación para este campo
    if (erroresValidacion[name]) {
      setErroresValidacion(prev => {
        const nuevos = { ...prev };
        delete nuevos[name];
        return nuevos;
      });
    }
  };

  const validarCampo = async (campo, valor) => {
    if (!valor || valor.trim() === '') {
      return null;
    }

    try {
      if (campo === 'identificacion_solicitante') {
        // Validar cédula
        const cedulaRes = await api.get(`/api/referencias/validar/cedula/${valor}`);
        if (cedulaRes.data.es_valida) {
          return { tipo: 'success', mensaje: `Cédula válida: ${cedulaRes.data.cedula_formateada}` };
        }

        // Si no es cédula, intentar NIT
        const nitRes = await api.get(`/api/referencias/validar/nit/${valor}`);
        if (nitRes.data.es_valido) {
          return { tipo: 'success', mensaje: `NIT válido: ${nitRes.data.nit_formateado}` };
        }

        return { tipo: 'error', mensaje: 'Identificación inválida. Debe ser cédula (6-10 dígitos) o NIT' };
      }
    } catch (error) {
      console.error('Error validando campo:', error);
    }
    return null;
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    const resultado = await validarCampo(name, value);

    if (resultado) {
      setErroresValidacion(prev => ({
        ...prev,
        [name]: resultado
      }));
    }
  };

  // Autoguardado cada 3 segundos después de cambios
  useEffect(() => {
    if (autoGuardadoRef.current) {
      clearTimeout(autoGuardadoRef.current);
    }

    autoGuardadoRef.current = setTimeout(() => {
      if (casoId) {
        guardarBorrador();
      }
    }, 3000);

    return () => {
      if (autoGuardadoRef.current) {
        clearTimeout(autoGuardadoRef.current);
      }
    };
  }, [formData]);

  const guardarBorrador = async () => {
    if (!casoId) return;

    try {
      setGuardando(true);
      await casoService.actualizarCaso(casoId, formData);
      setUltimoGuardado(new Date());
    } catch (error) {
      console.error('Error guardando borrador:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (casoId) {
        // Actualizar caso existente
        await casoService.actualizarCaso(casoId, formData);
        toast.success('Caso actualizado exitosamente');
      } else {
        // Crear nuevo caso
        const nuevoCaso = await casoService.crearCaso(formData);
        navigate(`/app/tutela/${nuevoCaso.id}`);
      }
    } catch (error) {
      console.error('Error guardando caso:', error);
      toast.error('Error al guardar el caso');
    }
  };

  const handleVolver = () => {
    navigate('/app/casos');
  };


  // Validar caso en tiempo real
  const validarCaso = async () => {
    if (!casoId) return null;

    try {
      const resultado = await casoService.validarCaso(casoId);
      setValidationResult(resultado);
      return resultado;
    } catch (error) {
      console.error('Error validando caso:', error);
      return null;
    }
  };

  // Validar después de cargar el caso
  useEffect(() => {
    if (casoId && caso) {
      validarCaso();
    }
  }, [casoId, caso]);

  const handleGenerarDocumento = async () => {
    if (!casoId) {
      toast.warning('Primero debes guardar el caso antes de generar el documento');
      return;
    }

    try {
      setGenerando(true);

      // Validar antes de generar
      const validacion = await validarCaso();
      if (validacion && !validacion.valido) {
        // No generamos, el usuario verá el resumen de errores en pantalla
        toast.error('Por favor corrige los errores señalados antes de generar el documento');
        // Scroll al resumen de validación
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const casoActualizado = await casoService.generarDocumento(casoId);
      setCaso(casoActualizado);
      setDocumentoGenerado(casoActualizado.documento_generado);
      setModoEdicion(false);
      toast.success('¡Documento generado exitosamente con IA!');
    } catch (error) {
      console.error('Error generando documento:', error);

      // Manejar error 422 con detalles de validación
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (detail.errores || detail.advertencias) {
          setValidationResult({
            valido: false,
            errores: detail.errores || [],
            advertencias: detail.advertencias || []
          });
          toast.error('El documento no se puede generar. Por favor corrige los errores señalados.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      const errorMsg = error.response?.data?.detail?.message || error.response?.data?.detail || 'Error al generar el documento';
      toast.error(errorMsg);
    } finally {
      setGenerando(false);
    }
  };

  const handleGuardarDocumento = async () => {
    if (!casoId) return;

    try {
      await casoService.actualizarCaso(casoId, { documento_generado: documentoGenerado });
      setModoEdicion(false);
      toast.success('Documento guardado exitosamente');
    } catch (error) {
      console.error('Error guardando documento:', error);
      toast.error('Error al guardar el documento');
    }
  };

  const handleDescargarTXT = () => {
    const tipoDocNombre = formData.tipo_documento === 'tutela' ? 'tutela' : 'derecho_peticion';
    const blob = new Blob([documentoGenerado], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tipoDocNombre}_${formData.nombre_solicitante || 'documento'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDescargarPDF = async () => {
    try {
      const tipoDocNombre = formData.tipo_documento === 'tutela' ? 'tutela' : 'derecho_peticion';
      const response = await casoService.descargarPDF(casoId);
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipoDocNombre}_${formData.nombre_solicitante || 'documento'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast.error('Error al descargar el PDF');
    }
  };

  const handleDescargarDOCX = async () => {
    try {
      const tipoDocNombre = formData.tipo_documento === 'tutela' ? 'tutela' : 'derecho_peticion';
      const response = await casoService.descargarDOCX(casoId);
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipoDocNombre}_${formData.nombre_solicitante || 'documento'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando DOCX:', error);
      toast.error('Error al descargar el DOCX');
    }
  };

  // Vista de solo lectura para modo vista
  if (modoVista && documentoGenerado) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--neutral-200)' }}>
        {/* Header */}
        <header className="shadow" style={{ backgroundColor: 'white' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--neutral-800)' }}>
                {formData.tipo_documento === 'tutela' ? 'Documento de Tutela' : 'Documento de Derecho de Petición'}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--neutral-600)' }}>
                {formData.nombre_solicitante || 'Documento generado'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleDescargarPDF}
                leftIcon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                📑 Descargar PDF
              </Button>
              <Button
                variant="neutral"
                onClick={handleVolver}
                leftIcon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                }
              >
                Volver
              </Button>
            </div>
          </div>
        </header>

        {/* Documento con estilos */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            className="shadow-lg rounded-lg p-12"
            style={{
              backgroundColor: 'white',
              border: '1px solid var(--neutral-300)',
            }}
          >
            <div
              className="documento-generado"
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: '14px',
                lineHeight: '1.8',
                color: 'var(--neutral-900)',
              }}
            >
              <style>
                {`
                  .documento-generado h1,
                  .documento-generado h2,
                  .documento-generado h3 {
                    font-weight: bold;
                    margin-top: 1.5em;
                    margin-bottom: 0.75em;
                    text-align: center;
                  }

                  .documento-generado h1 {
                    font-size: 18px;
                    text-transform: uppercase;
                  }

                  .documento-generado h2 {
                    font-size: 16px;
                  }

                  .documento-generado h3 {
                    font-size: 14px;
                  }

                  .documento-generado p {
                    margin-bottom: 1em;
                    text-align: justify;
                  }

                  .documento-generado strong {
                    font-weight: bold;
                  }

                  .documento-generado em {
                    font-style: italic;
                  }

                  .documento-generado ul,
                  .documento-generado ol {
                    margin-left: 2em;
                    margin-bottom: 1em;
                  }

                  .documento-generado li {
                    margin-bottom: 0.5em;
                  }
                `}
              </style>
              <pre
                className="whitespace-pre-wrap leading-relaxed"
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: '14px',
                  lineHeight: '1.8',
                }}
              >
                {documentoGenerado}
              </pre>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Vista de carga en modo vista si no hay documento
  if (modoVista && !documentoGenerado) {
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
          <p style={{ color: 'var(--neutral-600)' }}>Cargando documento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--neutral-200)' }}>
      {/* Header */}
      <header className="shadow" style={{ backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--neutral-800)' }}>
              {casoId
                ? (formData.tipo_documento === 'tutela' ? 'Editar Tutela' : 'Editar Derecho de Petición')
                : (formData.tipo_documento === 'tutela' ? 'Nueva Tutela' : 'Nuevo Derecho de Petición')
              }
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--neutral-600)' }}>
              {guardando && 'Guardando...'}
              {!guardando && ultimoGuardado && `Último guardado: ${ultimoGuardado.toLocaleTimeString()}`}
              {!guardando && !ultimoGuardado && casoId && 'Autoguardado activado'}
            </p>
          </div>
          <Button
            variant="neutral"
            onClick={handleVolver}
            leftIcon={
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            }
          >
            Volver al Dashboard
          </Button>
        </div>
      </header>

      {/* Formulario */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Análisis del Caso y Documento */}
        {casoId && caso && (
          <div className="mb-8">
            <AnalisisDocumento
              caso={caso}
            />
          </div>
        )}

        {/* Resumen de Validación */}
        {validationResult && (
          <ValidationSummary
            validationResult={validationResult}
            onFixErrors={() => window.scrollTo({ top: document.getElementById('formulario-caso').offsetTop - 100, behavior: 'smooth' })}
          />
        )}

        <form id="formulario-caso" onSubmit={handleSubmit} className="space-y-8">
          {/* Selector de Tipo de Documento */}
          {!casoId && (
            <div className="shadow rounded-lg p-6" style={{ backgroundColor: 'white' }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--neutral-800)' }}>Tipo de Documento Legal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all ${
                  formData.tipo_documento === 'tutela'
                    ? 'ring-2'
                    : 'hover:border-gray-400'
                }`} style={
                  formData.tipo_documento === 'tutela'
                    ? { borderColor: 'var(--color-primary)', ringColor: 'var(--color-primary)', backgroundColor: 'var(--color-info-light)' }
                    : { borderColor: 'var(--neutral-400)', backgroundColor: 'white' }
                }>
                  <input
                    type="radio"
                    name="tipo_documento"
                    value="tutela"
                    checked={formData.tipo_documento === 'tutela'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="flex items-center text-sm font-medium" style={{ color: 'var(--neutral-800)' }}>
                      <span className="text-2xl mr-2">⚖️</span>
                      Tutela
                    </span>
                    <span className="mt-1 text-xs" style={{ color: 'var(--neutral-600)' }}>
                      Para protección de derechos fundamentales (salud, vida, educación, etc.)
                    </span>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all ${
                  formData.tipo_documento === 'derecho_peticion'
                    ? 'ring-2'
                    : 'hover:border-gray-400'
                }`} style={
                  formData.tipo_documento === 'derecho_peticion'
                    ? { borderColor: 'var(--color-success)', ringColor: 'var(--color-success)', backgroundColor: '#f0fdf4' }
                    : { borderColor: 'var(--neutral-400)', backgroundColor: 'white' }
                }>
                  <input
                    type="radio"
                    name="tipo_documento"
                    value="derecho_peticion"
                    checked={formData.tipo_documento === 'derecho_peticion'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="flex items-center text-sm font-medium" style={{ color: 'var(--neutral-800)' }}>
                      <span className="text-2xl mr-2">📝</span>
                      Derecho de Petición
                    </span>
                    <span className="mt-1 text-xs" style={{ color: 'var(--neutral-600)' }}>
                      Para solicitar información, documentos o actuaciones administrativas
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Sección 1: Datos del Solicitante */}
          <div className="shadow rounded-lg p-6" style={{ backgroundColor: 'white' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--neutral-800)' }}>1. Datos del Solicitante</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={
                  <>
                    Nombre Completo *
                    {!casoId && formData.nombre_solicitante && (
                      <span className="ml-2 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4' }}>
                        Desde perfil
                      </span>
                    )}
                  </>
                }
                type="text"
                name="nombre_solicitante"
                value={formData.nombre_solicitante}
                onChange={handleChange}
                required
              />

              <Input
                label={
                  <>
                    Identificación (Cédula o NIT) *
                    {!casoId && formData.identificacion_solicitante && (
                      <span className="ml-2 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4' }}>
                        Desde perfil
                      </span>
                    )}
                  </>
                }
                type="text"
                name="identificacion_solicitante"
                value={formData.identificacion_solicitante}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ej: 1234567890 o 900123456-7"
                success={erroresValidacion.identificacion_solicitante?.tipo === 'success' ? erroresValidacion.identificacion_solicitante.mensaje : undefined}
                error={erroresValidacion.identificacion_solicitante?.tipo === 'error' ? erroresValidacion.identificacion_solicitante.mensaje : undefined}
                required
              />

              <div className="md:col-span-2">
                <Input
                  label={
                    <>
                      Dirección *
                      {!casoId && formData.direccion_solicitante && (
                        <span className="ml-2 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4' }}>
                          Desde perfil
                        </span>
                      )}
                    </>
                  }
                  type="text"
                  name="direccion_solicitante"
                  value={formData.direccion_solicitante}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                label={
                  <>
                    Teléfono
                    {!casoId && formData.telefono_solicitante && (
                      <span className="ml-2 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4' }}>
                        Desde perfil
                      </span>
                    )}
                  </>
                }
                type="tel"
                name="telefono_solicitante"
                value={formData.telefono_solicitante}
                onChange={handleChange}
                placeholder="Ej: 3001234567 o 6012345678"
                helpText="Formato: 10 dígitos para celular o 7 para fijo"
              />

              <Input
                label={
                  <>
                    Email
                    {!casoId && formData.email_solicitante && (
                      <span className="ml-2 text-xs px-2 py-1 rounded" style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4' }}>
                        Desde perfil
                      </span>
                    )}
                  </>
                }
                type="email"
                name="email_solicitante"
                value={formData.email_solicitante}
                onChange={handleChange}
              />
            </div>

            {/* Representación de Terceros */}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--neutral-300)' }}>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  name="actua_en_representacion"
                  checked={formData.actua_en_representacion}
                  onChange={handleChange}
                  style={{ accentColor: 'var(--color-primary)' }}
                  className="h-4 w-4 rounded"
                />
                <label className="text-sm font-medium" style={{ color: 'var(--neutral-800)' }}>
                  ¿Actúa en representación de otra persona? (menor, adulto mayor, persona con discapacidad, etc.)
                </label>
              </div>

              {formData.actua_en_representacion && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-info-light)', border: '1px solid var(--color-primary)' }}>
                  <div className="md:col-span-2">
                    <p className="text-sm mb-4" style={{ color: 'var(--color-primary-dark)' }}>
                      ℹ️ Proporciona los datos de la persona cuyos derechos están siendo representados
                    </p>
                  </div>

                  <Input
                    label="Nombre Completo de la Persona Representada *"
                    type="text"
                    name="nombre_representado"
                    value={formData.nombre_representado}
                    onChange={handleChange}
                    required={formData.actua_en_representacion}
                  />

                  <Input
                    label="Identificación de la Persona Representada *"
                    type="text"
                    name="identificacion_representado"
                    value={formData.identificacion_representado}
                    onChange={handleChange}
                    required={formData.actua_en_representacion}
                    placeholder="Ej: 1234567890"
                  />

                  <Input
                    label="Relación con la Persona Representada *"
                    type="text"
                    name="relacion_representado"
                    value={formData.relacion_representado}
                    onChange={handleChange}
                    required={formData.actua_en_representacion}
                    placeholder="Ej: madre, padre, hermano/a, tío/a, abuelo/a, cuidador/a, apoderado/a..."
                    helpText="Indica tu relación con la persona que representas"
                  />

                  <Input
                    label="Tipo de Persona Representada *"
                    type="text"
                    name="tipo_representado"
                    value={formData.tipo_representado}
                    onChange={handleChange}
                    required={formData.actua_en_representacion}
                    placeholder="Ej: menor de edad, adulto mayor, persona con discapacidad..."
                    helpText="Describe el tipo de persona que representas"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sección 2: Entidad Accionada/Destinataria */}
          <div className="shadow rounded-lg p-6" style={{ backgroundColor: 'white' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--neutral-800)' }}>
              2. {formData.tipo_documento === 'tutela' ? 'Entidad Accionada' : 'Entidad Destinataria'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Nombre de la Entidad *"
                  type="text"
                  name="entidad_accionada"
                  value={formData.entidad_accionada}
                  onChange={handleChange}
                  placeholder="Ej: Sanitas EPS, Ministerio de Salud..."
                  helpText="Comienza a escribir para ver sugerencias de entidades públicas"
                  list="entidades-sugerencias"
                  required
                />
                <datalist id="entidades-sugerencias">
                  {entidadesPublicas.map((entidad, index) => (
                    <option key={index} value={entidad} />
                  ))}
                </datalist>
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Dirección de la Entidad"
                  type="text"
                  name="direccion_entidad"
                  value={formData.direccion_entidad}
                  onChange={handleChange}
                />
              </div>

            </div>
          </div>

          {/* Sección 3: Contenido del Documento */}
          <div className="shadow rounded-lg p-6" style={{ backgroundColor: 'white' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--neutral-800)' }}>
              3. Contenido {formData.tipo_documento === 'tutela' ? 'de la Tutela' : 'del Derecho de Petición'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--neutral-700)' }}>
                  Hechos *
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--neutral-600)' }}>
                  {formData.tipo_documento === 'tutela'
                    ? 'Describe los hechos que fundamentan la tutela'
                    : 'Describe la situación que motiva tu petición'
                  }
                </p>
                <textarea
                  name="hechos"
                  value={formData.hechos}
                  onChange={handleChange}
                  rows={6}
                  style={{ borderColor: 'var(--neutral-400)', color: 'var(--neutral-800)' }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--neutral-400)'}
                />
                <FieldValidationMessages fieldName="hechos" validationResult={validationResult} />
              </div>

              {/* Campo Ciudad de los Hechos */}
              <div>
                <Input
                  label="Ciudad donde ocurrieron los hechos"
                  type="text"
                  name="ciudad_de_los_hechos"
                  value={formData.ciudad_de_los_hechos}
                  onChange={handleChange}
                  placeholder="Ej: Bogotá, Medellín, Cali..."
                />
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-600)' }}>
                  Indica solo la ciudad donde ocurrieron los hechos
                </p>
                <FieldValidationMessages fieldName="ciudad_de_los_hechos" validationResult={validationResult} />
              </div>

              {/* Campo Derechos Vulnerados - Solo para Tutelas */}
              {formData.tipo_documento === 'tutela' && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--neutral-700)' }}>
                    Derechos Vulnerados *
                  </label>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-600)' }}>
                    Indica qué derechos fundamentales fueron vulnerados
                  </p>

                  {/* Selector de derechos fundamentales */}
                  <details className="mb-2 rounded-md p-2" style={{ border: '1px solid var(--neutral-300)', backgroundColor: 'var(--neutral-200)' }}>
                    <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                      Ver derechos fundamentales disponibles
                    </summary>
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {derechosFundamentales.map((derecho, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 rounded cursor-pointer transition-colors"
                          style={{ color: 'var(--neutral-700)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-info-light)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            const texto = `${derecho.derecho} (Art. ${derecho.articulo}): ${derecho.descripcion}`;
                            setFormData(prev => ({
                              ...prev,
                              derechos_vulnerados: prev.derechos_vulnerados
                                ? prev.derechos_vulnerados + '\n\n' + texto
                                : texto
                            }));
                          }}
                        >
                          <span className="font-semibold">Art. {derecho.articulo}</span> - {derecho.derecho}
                          {derecho.nota && <span className="ml-2" style={{ color: 'var(--neutral-500)' }}>({derecho.nota})</span>}
                        </div>
                      ))}
                    </div>
                  </details>

                  <textarea
                    name="derechos_vulnerados"
                    value={formData.derechos_vulnerados}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Ej: Derecho a la Salud (Art. 49), Derecho a la Vida (Art. 11)..."
                    style={{ borderColor: 'var(--neutral-400)', color: 'var(--neutral-800)' }}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--neutral-400)'}
                  />
                  <FieldValidationMessages fieldName="derechos_vulnerados" validationResult={validationResult} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--neutral-700)' }}>
                  {formData.tipo_documento === 'tutela' ? 'Pretensiones' : 'Peticiones'} *
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--neutral-600)' }}>
                  {formData.tipo_documento === 'tutela'
                    ? 'Qué solicitas que ordene el juez'
                    : 'Qué información o actuación solicitas a la entidad'
                  }
                </p>
                <textarea
                  name="pretensiones"
                  value={formData.pretensiones}
                  onChange={handleChange}
                  rows={4}
                  style={{ borderColor: 'var(--neutral-400)', color: 'var(--neutral-800)' }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--neutral-400)'}
                />
                <FieldValidationMessages fieldName="pretensiones" validationResult={validationResult} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--neutral-700)' }}>
                  Fundamentos de Derecho
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--neutral-600)' }}>
                  Artículos, leyes o jurisprudencia que apoyan tu caso (opcional)
                </p>
                <textarea
                  name="fundamentos_derecho"
                  value={formData.fundamentos_derecho}
                  onChange={handleChange}
                  rows={4}
                  style={{ borderColor: 'var(--neutral-400)', color: 'var(--neutral-800)' }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--neutral-400)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--neutral-700)' }}>
                  Pruebas y Documentos Anexos
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--neutral-600)' }}>
                  Lista los documentos que anexarás (diagnósticos, fórmulas médicas, fotografías, derechos de petición previos, certificaciones, etc.)
                </p>
                <textarea
                  name="pruebas"
                  value={formData.pruebas}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Ej:&#10;- Diagnóstico médico del Dr. Juan Pérez (20/11/2024)&#10;- Fórmula médica para medicamento X&#10;- Derecho de petición radicado el 01/11/2024 (sin respuesta)&#10;- Fotografías del estado actual"
                  style={{ borderColor: 'var(--neutral-400)', color: 'var(--neutral-800)' }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--neutral-400)'}
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center gap-4">
            <Button
              type="button"
              variant="neutral"
              onClick={handleVolver}
              leftIcon={
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              }
            >
              Volver
            </Button>
            <div className="flex gap-4">
              {casoId && (
                <Button
                  type="button"
                  variant="success"
                  onClick={handleGenerarDocumento}
                  loading={generando}
                  disabled={generando}
                >
                  {generando ? 'Generando con IA...' : '🤖 Generar Documento con IA'}
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
              >
                {casoId
                  ? 'Guardar Cambios'
                  : (formData.tipo_documento === 'tutela' ? 'Crear Tutela' : 'Crear Derecho de Petición')
                }
              </Button>
            </div>
          </div>

          {/* Documento generado */}
          {documentoGenerado && (
            <div className="shadow rounded-lg p-6 mt-8" style={{ backgroundColor: 'white' }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--neutral-800)' }}>Documento Generado</h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ color: 'var(--color-success)', backgroundColor: '#f0fdf4' }}>
                    ✓ Generado con IA
                  </span>
                  {!modoEdicion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModoEdicion(true)}
                    >
                      ✏️ Editar
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--neutral-200)', border: '1px solid var(--neutral-300)' }}>
                {modoEdicion ? (
                  <textarea
                    value={documentoGenerado}
                    onChange={(e) => setDocumentoGenerado(e.target.value)}
                    rows={30}
                    style={{ borderColor: 'var(--neutral-400)', color: 'var(--neutral-800)' }}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 font-mono text-sm"
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--neutral-400)'}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed" style={{ color: 'var(--neutral-800)' }}>
                    {documentoGenerado}
                  </pre>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={handleDescargarTXT}
                  >
                    📄 Descargar TXT
                  </Button>
                  <Button
                    type="button"
                    variant="error"
                    size="sm"
                    onClick={handleDescargarPDF}
                  >
                    📑 Descargar PDF
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleDescargarDOCX}
                  >
                    📘 Descargar DOCX
                  </Button>
                </div>

                <div className="flex gap-2">
                  {modoEdicion && (
                    <>
                      <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        onClick={() => {
                          setModoEdicion(false);
                          cargarCaso();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleGuardarDocumento}
                      >
                        💾 Guardar Cambios
                      </Button>
                    </>
                  )}
                  {!modoEdicion && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(documentoGenerado);
                        toast.success('Documento copiado al portapapeles');
                      }}
                    >
                      📋 Copiar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

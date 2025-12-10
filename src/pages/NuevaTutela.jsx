import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import casoService from '../services/casoService';
import api from '../services/api';
import AnalisisDocumento from '../components/AnalisisDocumento';

export default function NuevaTutela() {
  const { casoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [documentoGenerado, setDocumentoGenerado] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  const autoGuardadoRef = useRef(null);
  const [caso, setCaso] = useState(null);

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
    representante_legal: '',
    hechos: '',
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
        representante_legal: casoData.representante_legal || '',
        hechos: casoData.hechos || '',
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
        alert('Caso actualizado exitosamente');
      } else {
        // Crear nuevo caso
        const nuevoCaso = await casoService.crearCaso(formData);
        navigate(`/app/tutela/${nuevoCaso.id}`);
      }
    } catch (error) {
      console.error('Error guardando caso:', error);
      alert('Error al guardar el caso');
    }
  };

  const handleVolver = () => {
    navigate('/app/dashboard');
  };

  const handleAnalizarFortaleza = async () => {
    if (!casoId) {
      alert('Primero debes guardar el caso antes de analizar');
      return;
    }

    try {
      setAnalizando(true);
      const casoActualizado = await casoService.analizarFortaleza(casoId);
      setCaso(casoActualizado);
      alert('Análisis completado. Revisa los resultados abajo.');
    } catch (error) {
      console.error('Error analizando fortaleza:', error);
      const errorMsg = error.response?.data?.detail || 'Error al analizar el caso';
      alert(errorMsg);
    } finally {
      setAnalizando(false);
    }
  };

  const handleGenerarDocumento = async () => {
    if (!casoId) {
      alert('Primero debes guardar el caso antes de generar el documento');
      return;
    }

    try {
      setGenerando(true);
      const casoActualizado = await casoService.generarDocumento(casoId);
      setCaso(casoActualizado);
      setDocumentoGenerado(casoActualizado.documento_generado);
      setModoEdicion(false);
      alert('¡Documento generado exitosamente con IA!\n\nRevisa el análisis de calidad y jurisprudencia abajo.');
    } catch (error) {
      console.error('Error generando documento:', error);
      const errorMsg = error.response?.data?.detail || 'Error al generar el documento';
      alert(errorMsg);
    } finally {
      setGenerando(false);
    }
  };

  const handleGuardarDocumento = async () => {
    if (!casoId) return;

    try {
      await casoService.actualizarCaso(casoId, { documento_generado: documentoGenerado });
      setModoEdicion(false);
      alert('Documento guardado exitosamente');
    } catch (error) {
      console.error('Error guardando documento:', error);
      alert('Error al guardar el documento');
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
      alert('Error al descargar el PDF');
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
      alert('Error al descargar el DOCX');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {casoId
                ? (formData.tipo_documento === 'tutela' ? 'Editar Tutela' : 'Editar Derecho de Petición')
                : (formData.tipo_documento === 'tutela' ? 'Nueva Tutela' : 'Nuevo Derecho de Petición')
              }
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {guardando && 'Guardando...'}
              {!guardando && ultimoGuardado && `Último guardado: ${ultimoGuardado.toLocaleTimeString()}`}
              {!guardando && !ultimoGuardado && casoId && 'Autoguardado activado'}
            </p>
          </div>
          <button
            onClick={handleVolver}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </header>

      {/* Formulario */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Análisis del Caso y Documento */}
        {casoId && caso && (
          <div className="mb-8">
            <AnalisisDocumento
              caso={caso}
              onAnalizarFortaleza={handleAnalizarFortaleza}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Selector de Tipo de Documento */}
          {!casoId && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Tipo de Documento Legal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  formData.tipo_documento === 'tutela'
                    ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="tipo_documento"
                    value="tutela"
                    checked={formData.tipo_documento === 'tutela'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="flex items-center text-sm font-medium text-gray-900">
                      <span className="text-2xl mr-2">⚖️</span>
                      Tutela
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      Para protección de derechos fundamentales (salud, vida, educación, etc.)
                    </span>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  formData.tipo_documento === 'derecho_peticion'
                    ? 'border-green-600 ring-2 ring-green-600 bg-green-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="tipo_documento"
                    value="derecho_peticion"
                    checked={formData.tipo_documento === 'derecho_peticion'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="flex items-center text-sm font-medium text-gray-900">
                      <span className="text-2xl mr-2">📝</span>
                      Derecho de Petición
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      Para solicitar información, documentos o actuaciones administrativas
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Sección 1: Datos del Solicitante */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Datos del Solicitante</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="nombre_solicitante"
                  value={formData.nombre_solicitante}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identificación (Cédula o NIT) *
                </label>
                <input
                  type="text"
                  name="identificacion_solicitante"
                  value={formData.identificacion_solicitante}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  placeholder="Ej: 1234567890 o 900123456-7"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    erroresValidacion.identificacion_solicitante?.tipo === 'error'
                      ? 'border-red-500 focus:ring-red-500'
                      : erroresValidacion.identificacion_solicitante?.tipo === 'success'
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-indigo-500'
                  }`}
                />
                {erroresValidacion.identificacion_solicitante && (
                  <p className={`text-xs mt-1 ${
                    erroresValidacion.identificacion_solicitante.tipo === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {erroresValidacion.identificacion_solicitante.mensaje}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  name="direccion_solicitante"
                  value={formData.direccion_solicitante}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="telefono_solicitante"
                  value={formData.telefono_solicitante}
                  onChange={handleChange}
                  placeholder="Ej: 3001234567 o 6012345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: 10 dígitos para celular o 7 para fijo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email_solicitante"
                  value={formData.email_solicitante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Representación de Terceros */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  name="actua_en_representacion"
                  checked={formData.actua_en_representacion}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-900">
                  ¿Actúa en representación de otra persona? (menor, adulto mayor, persona con discapacidad, etc.)
                </label>
              </div>

              {formData.actua_en_representacion && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="md:col-span-2">
                    <p className="text-sm text-blue-800 mb-4">
                      ℹ️ Proporciona los datos de la persona cuyos derechos están siendo representados
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo de la Persona Representada *
                    </label>
                    <input
                      type="text"
                      name="nombre_representado"
                      value={formData.nombre_representado}
                      onChange={handleChange}
                      required={formData.actua_en_representacion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Identificación de la Persona Representada *
                    </label>
                    <input
                      type="text"
                      name="identificacion_representado"
                      value={formData.identificacion_representado}
                      onChange={handleChange}
                      required={formData.actua_en_representacion}
                      placeholder="Ej: 1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relación con la Persona Representada *
                    </label>
                    <select
                      name="relacion_representado"
                      value={formData.relacion_representado}
                      onChange={handleChange}
                      required={formData.actua_en_representacion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seleccione...</option>
                      <option value="madre">Madre</option>
                      <option value="padre">Padre</option>
                      <option value="hijo">Hijo/a</option>
                      <option value="cuidador">Cuidador/a</option>
                      <option value="apoderado">Apoderado/a</option>
                      <option value="tutor">Tutor/a legal</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Persona Representada *
                    </label>
                    <select
                      name="tipo_representado"
                      value={formData.tipo_representado}
                      onChange={handleChange}
                      required={formData.actua_en_representacion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seleccione...</option>
                      <option value="menor">Menor de edad</option>
                      <option value="adulto_mayor">Adulto mayor</option>
                      <option value="persona_discapacidad">Persona con discapacidad</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección 2: Entidad Accionada/Destinataria */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              2. {formData.tipo_documento === 'tutela' ? 'Entidad Accionada' : 'Entidad Destinataria'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Entidad *
                </label>
                <input
                  type="text"
                  name="entidad_accionada"
                  value={formData.entidad_accionada}
                  onChange={handleChange}
                  required
                  list="entidades-sugerencias"
                  placeholder="Ej: Sanitas EPS, Ministerio de Salud..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="entidades-sugerencias">
                  {entidadesPublicas.map((entidad, index) => (
                    <option key={index} value={entidad} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Comienza a escribir para ver sugerencias de entidades públicas
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de la Entidad
                </label>
                <input
                  type="text"
                  name="direccion_entidad"
                  value={formData.direccion_entidad}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Representante Legal
                </label>
                <input
                  type="text"
                  name="representante_legal"
                  value={formData.representante_legal}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Contenido del Documento */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              3. Contenido {formData.tipo_documento === 'tutela' ? 'de la Tutela' : 'del Derecho de Petición'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hechos *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {formData.tipo_documento === 'tutela'
                    ? 'Describe los hechos que fundamentan la tutela'
                    : 'Describe la situación que motiva tu petición'
                  }
                </p>
                <textarea
                  name="hechos"
                  value={formData.hechos}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Campo Derechos Vulnerados - Solo para Tutelas */}
              {formData.tipo_documento === 'tutela' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Derechos Vulnerados *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Indica qué derechos fundamentales fueron vulnerados
                  </p>

                  {/* Selector de derechos fundamentales */}
                  <details className="mb-2 border border-gray-200 rounded-md p-2 bg-gray-50">
                    <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-800">
                      Ver derechos fundamentales disponibles
                    </summary>
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                      {derechosFundamentales.map((derecho, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 hover:bg-indigo-50 rounded cursor-pointer"
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
                          {derecho.nota && <span className="text-gray-500 ml-2">({derecho.nota})</span>}
                        </div>
                      ))}
                    </div>
                  </details>

                  <textarea
                    name="derechos_vulnerados"
                    value={formData.derechos_vulnerados}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Ej: Derecho a la Salud (Art. 49), Derecho a la Vida (Art. 11)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.tipo_documento === 'tutela' ? 'Pretensiones' : 'Peticiones'} *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {formData.tipo_documento === 'tutela'
                    ? 'Qué solicitas que ordene el juez'
                    : 'Qué información o actuación solicitas a la entidad'
                  }
                </p>
                <textarea
                  name="pretensiones"
                  value={formData.pretensiones}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fundamentos de Derecho
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Artículos, leyes o jurisprudencia que apoyan tu caso (opcional)
                </p>
                <textarea
                  name="fundamentos_derecho"
                  value={formData.fundamentos_derecho}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pruebas y Documentos Anexos
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Lista los documentos que anexarás (diagnósticos, fórmulas médicas, fotografías, derechos de petición previos, certificaciones, etc.)
                </p>
                <textarea
                  name="pruebas"
                  value={formData.pruebas}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Ej:&#10;- Diagnóstico médico del Dr. Juan Pérez (20/11/2024)&#10;- Fórmula médica para medicamento X&#10;- Derecho de petición radicado el 01/11/2024 (sin respuesta)&#10;- Fotografías del estado actual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={handleVolver}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Volver
            </button>
            <div className="flex gap-4">
              {casoId && (
                <>
                  <button
                    type="button"
                    onClick={handleAnalizarFortaleza}
                    disabled={analizando || generando}
                    className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {analizando ? 'Analizando...' : '🔍 Analizar Fortaleza'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerarDocumento}
                    disabled={generando || analizando}
                    className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {generando ? 'Generando con IA...' : '🤖 Generar Documento con IA'}
                  </button>
                </>
              )}
              <button
                type="submit"
                className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {casoId
                  ? 'Guardar Cambios'
                  : (formData.tipo_documento === 'tutela' ? 'Crear Tutela' : 'Crear Derecho de Petición')
                }
              </button>
            </div>
          </div>

          {/* Documento generado */}
          {documentoGenerado && (
            <div className="bg-white shadow rounded-lg p-6 mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Documento Generado</h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                    ✓ Generado con IA
                  </span>
                  {!modoEdicion && (
                    <button
                      onClick={() => setModoEdicion(true)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                {modoEdicion ? (
                  <textarea
                    value={documentoGenerado}
                    onChange={(e) => setDocumentoGenerado(e.target.value)}
                    rows={30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {documentoGenerado}
                  </pre>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDescargarTXT}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    📄 Descargar TXT
                  </button>
                  <button
                    type="button"
                    onClick={handleDescargarPDF}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    📑 Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleDescargarDOCX}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    📘 Descargar DOCX
                  </button>
                </div>

                <div className="flex gap-2">
                  {modoEdicion && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setModoEdicion(false);
                          cargarCaso();
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleGuardarDocumento}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                      >
                        💾 Guardar Cambios
                      </button>
                    </>
                  )}
                  {!modoEdicion && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(documentoGenerado);
                        alert('Documento copiado al portapapeles');
                      }}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                    >
                      📋 Copiar
                    </button>
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

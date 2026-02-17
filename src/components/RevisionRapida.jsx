import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import casoService from '../services/casoService';
import api from '../services/api';
import Button from './Button';
import Modal from './Modal';
import { trackEvent } from '../utils/analytics';

/**
 * Componente de Revisión Rápida (Estado D según plan.md)
 *
 * Permite:
 * - Ver conversación como referencia
 * - Editar campos críticos manualmente (sin IA)
 * - Ver datos del solicitante en SOLO LECTURA (desde perfil)
 * - Validar campos bloqueantes antes de generar
 * - Generar documento desde la misma interfaz
 */
export default function RevisionRapida({ caso, conversacion = [], onCasoUpdated, onDocumentoGenerado, onAbandonar }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [validacion, setValidacion] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const autoGuardadoRef = useRef(null);

  // Inicializar formData con datos del caso
  useEffect(() => {
    if (caso) {
      setFormData({
        // Datos del perfil (editables)
        nombre_solicitante: caso.nombre_solicitante || '',
        identificacion_solicitante: caso.identificacion_solicitante || '',
        direccion_solicitante: caso.direccion_solicitante || '',
        telefono_solicitante: caso.telefono_solicitante || '',
        email_solicitante: caso.email_solicitante || '',
        // Datos del caso
        tipo_documento: caso.tipo_documento || 'tutela',
        actua_en_representacion: caso.actua_en_representacion || false,
        nombre_representado: caso.nombre_representado || '',
        identificacion_representado: caso.identificacion_representado || '',
        relacion_representado: caso.relacion_representado || '',
        tipo_representado: caso.tipo_representado || '',
        entidad_accionada: caso.entidad_accionada || '',
        direccion_entidad: caso.direccion_entidad || '',
        hechos: caso.hechos || '',
        ciudad_de_los_hechos: caso.ciudad_de_los_hechos || '',
        derechos_vulnerados: caso.derechos_vulnerados || '',
        pretensiones: caso.pretensiones || '',
        fundamentos_derecho: caso.fundamentos_derecho || '',
        pruebas: caso.pruebas || ''
      });

      // Cargar validación de campos críticos
      cargarValidacion();
    }
  }, [caso]);

  // Cargar validación de campos críticos
  const cargarValidacion = async () => {
    if (!caso?.id) return;

    try {
      const response = await api.get(`/casos/${caso.id}/campos-criticos`);
      setValidacion(response.data);
    } catch (error) {
      console.error('Error cargando validación:', error);
    }
  };

  // Manejar cambios en campos
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Auto-guardado cada 3 segundos
  useEffect(() => {
    if (autoGuardadoRef.current) {
      clearTimeout(autoGuardadoRef.current);
    }

    autoGuardadoRef.current = setTimeout(() => {
      if (caso?.id) {
        guardarCambios();
      }
    }, 3000);

    return () => {
      if (autoGuardadoRef.current) {
        clearTimeout(autoGuardadoRef.current);
      }
    };
  }, [formData]);

  // Guardar cambios
  const guardarCambios = async () => {
    if (!caso?.id) return;

    try {
      setGuardando(true);

      // Actualizar el caso (sin modificar el perfil del usuario)
      const casoActualizado = await casoService.actualizarCaso(caso.id, formData);
      onCasoUpdated?.(casoActualizado);

      await cargarValidacion(); // Recargar validación después de guardar
    } catch (error) {
      console.error('Error guardando cambios:', error);
    } finally {
      setGuardando(false);
    }
  };

  // Generar documento
  const handleGenerarDocumento = async () => {
    if (!validacion?.puede_generar) {
      toast.warning('Por favor completa todos los campos obligatorios antes de generar el documento');
      return;
    }

    trackEvent('document_generation_initiated', { case_id: caso.id, document_type: formData.tipo_documento });
    // Mostrar confirmación de datos sensibles
    setConfirmacionVisible(true);
  };

  // Confirmar y generar documento
  const confirmarYGenerar = async () => {
    setConfirmacionVisible(false);

    try {
      setGenerando(true);
      setProgressStep(0);

      // Paso 1: Validando información
      setProgressStep(1);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Paso 2: Procesando con IA
      setProgressStep(2);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Paso 3: Creando documento
      setProgressStep(3);
      const casoActualizado = await casoService.generarDocumento(caso.id);
      onDocumentoGenerado?.(casoActualizado);

      // Paso 4: Finalizando
      setProgressStep(4);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mostrar toast de éxito
      trackEvent('document_generated', { case_id: caso.id, document_type: formData.tipo_documento });
      toast.success('Documento generado');

      // Redireccionar al caso en modo vista
      setTimeout(() => {
        navigate(`/app/tutela/${caso.id}?mode=view`);
      }, 800);

    } catch (error) {
      console.error('Error generando documento:', error);
      trackEvent('document_generation_error', { case_id: caso.id, error_message: error.message });
      toast.error(error.response?.data?.detail?.message || 'Error al generar el documento');
      setProgressStep(0);
    } finally {
      setTimeout(() => {
        setGenerando(false);
      }, 1000);
    }
  };

  if (!caso) {
    return (
      <div className="text-center text-neutral-400 py-8">
        No hay datos del caso para revisar
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Panel de conversación (30% izquierda) */}
      <div className="w-[30%] rounded-lg overflow-hidden flex flex-col" style={{ backgroundColor: 'white', border: '1px solid var(--neutral-300)' }}>
        <div className="px-4 py-3 border-b" style={{ backgroundColor: 'var(--neutral-200)', borderColor: 'var(--neutral-300)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--neutral-800)' }}>Conversación de Referencia</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-600)' }}>{conversacion.length} mensajes</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversacion.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--neutral-500)' }}>
              No hay conversación disponible
            </p>
          ) : (
            conversacion.map((msg, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: msg.remitente === 'usuario'
                    ? 'rgba(11, 109, 255, 0.1)'
                    : 'var(--neutral-200)',
                  color: msg.remitente === 'usuario'
                    ? 'var(--color-primary-dark)'
                    : 'var(--neutral-700)'
                }}
              >
                <div className="font-semibold text-xs mb-1 opacity-75">
                  {msg.remitente === 'usuario' ? 'Tú' : 'Asistente'}
                </div>
                <div className="whitespace-pre-wrap">{msg.texto}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel de revisión (70% derecha) */}
      <div className="flex-1 rounded-lg overflow-hidden flex flex-col" style={{ backgroundColor: 'white', border: '1px solid var(--neutral-300)' }}>
        <div className="px-4 py-3 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--neutral-200)', borderColor: 'var(--neutral-300)' }}>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--neutral-800)' }}>Revisión Rápida de Datos</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-600)' }}>
              {guardando ? 'Guardando...' : 'Auto-guardado activado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {validacion && (
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  backgroundColor: validacion.puede_generar
                    ? 'var(--color-success-dark)'
                    : 'var(--color-warning-dark)',
                  color: validacion.puede_generar
                    ? 'var(--color-success-light)'
                    : 'var(--color-warning-light)'
                }}
              >
                {validacion.puede_generar
                  ? '✓ Listo para generar'
                  : `${validacion.bloqueantes_faltantes.length} campos obligatorios faltantes`}
              </span>
            )}
            {/* Botón cancelar sesión */}
            {onAbandonar && (
              <button
                onClick={onAbandonar}
                className="text-xs px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                style={{
                  backgroundColor: 'var(--neutral-300)',
                  color: 'var(--neutral-700)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-error)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-300)';
                  e.currentTarget.style.color = 'var(--neutral-700)';
                }}
                title="Cancelar y eliminar este caso"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar sesión
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Datos del Solicitante (Editables) */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: validacion?.bloqueantes_faltantes?.some(c => c === 'nombre_solicitante' || c === 'identificacion_solicitante')
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(11, 109, 255, 0.05)',
              border: validacion?.bloqueantes_faltantes?.some(c => c === 'nombre_solicitante' || c === 'identificacion_solicitante')
                ? '2px solid var(--color-error)'
                : '2px solid var(--color-primary)'
            }}
          >
            <div className="mb-3">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--neutral-800)' }}>Datos del Solicitante</h4>
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-primary-dark)' }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Los cambios solo aplican a este documento (tu perfil no se modifica)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs flex items-center gap-2" style={{ color: 'var(--neutral-700)' }}>
                  Nombre Completo *
                  {validacion?.bloqueantes_faltantes?.includes('nombre_solicitante') && (
                    <span style={{ color: 'var(--color-error)' }} className="text-xs">Obligatorio</span>
                  )}
                </label>
                <input
                  type="text"
                  name="nombre_solicitante"
                  value={formData.nombre_solicitante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--neutral-800)',
                    border: validacion?.bloqueantes_faltantes?.includes('nombre_solicitante')
                      ? '1px solid var(--color-error)'
                      : '1px solid var(--neutral-300)'
                  }}
                  placeholder="Ej: Juan Pérez García"
                />
              </div>
              <div>
                <label className="text-xs flex items-center gap-2" style={{ color: 'var(--neutral-700)' }}>
                  Identificación *
                  {validacion?.bloqueantes_faltantes?.includes('identificacion_solicitante') && (
                    <span style={{ color: 'var(--color-error)' }} className="text-xs">Obligatorio</span>
                  )}
                </label>
                <input
                  type="text"
                  name="identificacion_solicitante"
                  value={formData.identificacion_solicitante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--neutral-800)',
                    border: validacion?.bloqueantes_faltantes?.includes('identificacion_solicitante')
                      ? '1px solid var(--color-error)'
                      : '1px solid var(--neutral-300)'
                  }}
                  placeholder="Ej: 1234567890"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs" style={{ color: 'var(--neutral-700)' }}>Dirección</label>
                <input
                  type="text"
                  name="direccion_solicitante"
                  value={formData.direccion_solicitante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--neutral-800)',
                    border: '1px solid var(--neutral-300)'
                  }}
                  placeholder="Ej: Calle 123 #45-67, Bogotá"
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--neutral-700)' }}>Teléfono</label>
                <input
                  type="text"
                  name="telefono_solicitante"
                  value={formData.telefono_solicitante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--neutral-800)',
                    border: '1px solid var(--neutral-300)'
                  }}
                  placeholder="Ej: 3001234567"
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--neutral-700)' }}>
                  Email (solo para documento)
                </label>
                <input
                  type="email"
                  name="email_solicitante"
                  value={formData.email_solicitante}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: 'white',
                    color: 'var(--neutral-800)',
                    border: '1px solid var(--neutral-300)'
                  }}
                  placeholder="Ej: correo@ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Campos Críticos Editables */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--neutral-100)', border: '1px solid var(--neutral-300)' }}>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--neutral-800)' }}>Campos Críticos</h4>

            {/* Entidad Accionada */}
            <div className="mb-3">
              <label className="text-sm flex items-center gap-2" style={{ color: 'var(--neutral-700)' }}>
                Entidad {formData.tipo_documento === 'tutela' ? 'Accionada' : 'Destinataria'} *
                {validacion?.bloqueantes_faltantes.includes('entidad_accionada') && (
                  <span style={{ color: 'var(--color-error)' }} className="text-xs">Obligatorio</span>
                )}
              </label>
              <input
                type="text"
                name="entidad_accionada"
                value={formData.entidad_accionada}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
                placeholder="Ej: Ministerio de Salud"
              />
            </div>

            {/* Hechos */}
            <div className="mb-3">
              <label className="text-sm flex items-center gap-2" style={{ color: 'var(--neutral-700)' }}>
                Hechos *
                {validacion?.bloqueantes_faltantes.includes('hechos') && (
                  <span style={{ color: 'var(--color-error)' }} className="text-xs">Obligatorio</span>
                )}
              </label>
              <textarea
                name="hechos"
                value={formData.hechos}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
                placeholder="Describe los hechos..."
              />
            </div>

            {/* Derechos Vulnerados (solo para tutela) */}
            {formData.tipo_documento === 'tutela' && (
              <div className="mb-3">
                <label className="text-sm flex items-center gap-2" style={{ color: 'var(--neutral-700)' }}>
                  Derechos Vulnerados *
                  {validacion?.bloqueantes_faltantes.includes('derechos_vulnerados') && (
                    <span style={{ color: 'var(--color-error)' }} className="text-xs">Obligatorio</span>
                  )}
                </label>
                <textarea
                  name="derechos_vulnerados"
                  value={formData.derechos_vulnerados}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
                  placeholder="Ej: Derecho a la Salud (Art. 49)"
                />
              </div>
            )}

            {/* Pretensiones */}
            <div className="mb-3">
              <label className="text-sm flex items-center gap-2" style={{ color: 'var(--neutral-700)' }}>
                {formData.tipo_documento === 'tutela' ? 'Pretensiones' : 'Peticiones'} *
                {validacion?.bloqueantes_faltantes.includes('pretensiones') && (
                  <span style={{ color: 'var(--color-error)' }} className="text-xs">Obligatorio</span>
                )}
              </label>
              <textarea
                name="pretensiones"
                value={formData.pretensiones}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
                placeholder="Qué solicitas..."
              />
            </div>
          </div>

          {/* Campos Sensibles */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--neutral-100)', border: '1px solid var(--neutral-300)' }}>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--neutral-800)' }}>Información Adicional (Recomendado)</h4>

            <div className="mb-3">
              <label className="text-sm" style={{ color: 'var(--neutral-700)' }}>Dirección de la Entidad</label>
              <input
                type="text"
                name="direccion_entidad"
                value={formData.direccion_entidad}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
              />
            </div>

            <div className="mb-3">
              <label className="text-sm" style={{ color: 'var(--neutral-700)' }}>Ciudad donde ocurrieron los hechos</label>
              <input
                type="text"
                name="ciudad_de_los_hechos"
                value={formData.ciudad_de_los_hechos}
                onChange={handleChange}
                placeholder="Ej: Bogotá, Medellín, Cali..."
                className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
              />
            </div>

            <div className="mb-3">
              <label className="text-sm" style={{ color: 'var(--neutral-700)' }}>Pruebas y Documentos Anexos</label>
              <textarea
                name="pruebas"
                value={formData.pruebas}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--neutral-300)' }}
                placeholder="Lista de documentos que anexarás..."
              />
            </div>
          </div>

          {/* Representación */}
          {formData.actua_en_representacion && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'rgba(11, 109, 255, 0.08)', borderColor: 'var(--color-primary)' }}>
              <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-primary-dark)' }}>Datos del Representado</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm" style={{ color: 'var(--color-primary-dark)' }}>Nombre del Representado</label>
                  <input
                    type="text"
                    name="nombre_representado"
                    value={formData.nombre_representado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--color-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ color: 'var(--color-primary-dark)' }}>Identificación</label>
                  <input
                    type="text"
                    name="identificacion_representado"
                    value={formData.identificacion_representado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--color-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-sm" style={{ color: 'var(--color-primary-dark)' }}>Relación</label>
                  <input
                    type="text"
                    name="relacion_representado"
                    value={formData.relacion_representado}
                    onChange={handleChange}
                    placeholder="Ej: madre, padre, hermano/a, tío/a..."
                    className="w-full px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: 'white', color: 'var(--neutral-800)', border: '1px solid var(--color-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botón de generar */}
        <div className="px-4 py-3 border-t flex justify-between items-center" style={{ backgroundColor: 'var(--neutral-200)', borderColor: 'var(--neutral-300)' }}>
          <div className="text-sm">
            {validacion?.bloqueantes_faltantes.length > 0 ? (
              <div style={{ color: 'var(--color-warning-dark)' }}>
                <div className="font-semibold mb-1">Faltan {validacion.bloqueantes_faltantes.length} campo(s) obligatorio(s):</div>
                <div className="text-xs">
                  {validacion.bloqueantes_faltantes.map((campo, idx) => (
                    <span key={campo}>
                      {campo === 'nombre_solicitante' && 'Nombre del solicitante'}
                      {campo === 'identificacion_solicitante' && 'Identificación válida'}
                      {campo === 'entidad_accionada' && 'Entidad destinataria'}
                      {campo === 'hechos' && 'Hechos'}
                      {campo === 'derechos_vulnerados' && 'Derechos vulnerados'}
                      {campo === 'pretensiones' && 'Peticiones'}
                      {idx < validacion.bloqueantes_faltantes.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span style={{ color: 'var(--color-success-dark)' }}>
                Todos los campos obligatorios completados
              </span>
            )}
          </div>
          <button
            onClick={handleGenerarDocumento}
            disabled={!validacion?.puede_generar || generando}
            className="px-6 py-2 rounded font-semibold transition text-white"
            style={{
              backgroundColor: validacion?.puede_generar && !generando
                ? 'var(--color-success)'
                : 'var(--neutral-400)',
              cursor: !validacion?.puede_generar || generando ? 'not-allowed' : 'pointer',
              opacity: !validacion?.puede_generar || generando ? '0.6' : '1'
            }}
            onMouseEnter={(e) => {
              if (validacion?.puede_generar && !generando) {
                e.currentTarget.style.backgroundColor = 'var(--color-success-dark)';
              }
            }}
            onMouseLeave={(e) => {
              if (validacion?.puede_generar && !generando) {
                e.currentTarget.style.backgroundColor = 'var(--color-success)';
              }
            }}
          >
            {generando ? 'Generando...' : 'Generar Documento'}
          </button>
        </div>
      </div>

      {/* Progress Stepper Modal */}
      {generando && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-6 shadow-xl" style={{ backgroundColor: 'white', minWidth: '400px' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--neutral-800)' }}>
              🤖 Generando Documento
            </h3>
            <div className="space-y-3">
              {/* Paso 1 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${progressStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {progressStep > 1 ? '✓' : '1'}
                </div>
                <span style={{ color: progressStep >= 1 ? 'var(--neutral-800)' : 'var(--neutral-500)' }}>
                  Validando información
                </span>
              </div>

              {/* Paso 2 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${progressStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {progressStep > 2 ? '✓' : progressStep === 2 ? '⟳' : '2'}
                </div>
                <span style={{ color: progressStep >= 2 ? 'var(--neutral-800)' : 'var(--neutral-500)' }}>
                  Procesando con IA
                </span>
              </div>

              {/* Paso 3 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${progressStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {progressStep > 3 ? '✓' : progressStep === 3 ? '⟳' : '3'}
                </div>
                <span style={{ color: progressStep >= 3 ? 'var(--neutral-800)' : 'var(--neutral-500)' }}>
                  Creando documento
                </span>
              </div>

              {/* Paso 4 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${progressStep >= 4 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {progressStep > 4 ? '✓' : progressStep === 4 ? '⟳' : '4'}
                </div>
                <span style={{ color: progressStep >= 4 ? 'var(--neutral-800)' : 'var(--neutral-500)' }}>
                  Finalizando
                </span>
              </div>
            </div>

            {progressStep === 4 && (
              <p className="text-sm mt-4 text-center" style={{ color: 'var(--color-success-dark)' }}>
                Abriendo caso...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación de datos sensibles */}
      <Modal
        isOpen={confirmacionVisible}
        onClose={() => setConfirmacionVisible(false)}
        title="Confirmar Datos Sensibles"
        size="md"
        footer={
          <>
            <Button
              variant="neutral"
              onClick={() => setConfirmacionVisible(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={confirmarYGenerar}
            >
              Confirmar y Generar
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p style={{ color: 'var(--neutral-700)' }}>
            Por favor confirma que los siguientes datos son correctos:
          </p>

          <div
            className="rounded p-3"
            style={{ backgroundColor: 'var(--neutral-200)' }}
          >
            <div
              className="text-xs mb-1"
              style={{ color: 'var(--neutral-600)' }}
            >
              Identificación
            </div>
            <div style={{ color: 'var(--neutral-800)' }}>
              {caso.identificacion_solicitante || 'No especificado'}
            </div>
          </div>

          <div
            className="rounded p-3"
            style={{ backgroundColor: 'var(--neutral-200)' }}
          >
            <div
              className="text-xs mb-1"
              style={{ color: 'var(--neutral-600)' }}
            >
              Dirección
            </div>
            <div style={{ color: 'var(--neutral-800)' }}>
              {caso.direccion_solicitante || 'No especificado'}
            </div>
          </div>

          <div
            className="rounded p-3"
            style={{ backgroundColor: 'var(--neutral-200)' }}
          >
            <div
              className="text-xs mb-1"
              style={{ color: 'var(--neutral-600)' }}
            >
              Entidad
            </div>
            <div style={{ color: 'var(--neutral-800)' }}>
              {formData.entidad_accionada || 'No especificado'}
            </div>
          </div>

          {formData.actua_en_representacion && (
            <div
              className="rounded p-3 border"
              style={{
                backgroundColor: 'var(--color-info-light)',
                borderColor: 'var(--color-primary)',
              }}
            >
              <div
                className="text-xs mb-1"
                style={{ color: 'var(--color-primary-dark)' }}
              >
                Datos del Representado
              </div>
              <div style={{ color: 'var(--neutral-800)' }}>
                {formData.nombre_representado} - {formData.identificacion_representado}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

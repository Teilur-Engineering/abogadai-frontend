import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import casoService from '../services/casoService';
import api from '../services/api';
import Button from './Button';
import Modal from './Modal';

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
export default function RevisionRapida({ caso, conversacion = [], onCasoUpdated, onDocumentoGenerado }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [validacion, setValidacion] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);
  const autoGuardadoRef = useRef(null);

  // Inicializar formData con datos del caso
  useEffect(() => {
    if (caso) {
      setFormData({
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

    // Mostrar confirmación de datos sensibles
    setConfirmacionVisible(true);
  };

  // Confirmar y generar documento
  const confirmarYGenerar = async () => {
    setConfirmacionVisible(false);

    try {
      setGenerando(true);
      const casoActualizado = await casoService.generarDocumento(caso.id);
      onDocumentoGenerado?.(casoActualizado);

      // Descargar automáticamente PDF
      const pdfBlob = await casoService.descargarPDF(caso.id);
      const url = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.tipo_documento}_${caso.nombre_solicitante || 'documento'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Documento generado y descargado exitosamente');
    } catch (error) {
      console.error('Error generando documento:', error);
      toast.error(error.response?.data?.detail?.message || 'Error al generar el documento');
    } finally {
      setGenerando(false);
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Datos del Solicitante (Solo Lectura) */}
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--neutral-100)', border: '1px solid var(--neutral-300)' }}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--neutral-800)' }}>Datos del Solicitante</h4>
              <button
                onClick={() => navigate('/app/perfil')}
                className="text-xs text-white px-3 py-1 rounded transition"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
              >
                Ir a Perfil para editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs" style={{ color: 'var(--neutral-600)' }}>Nombre</label>
                <div className="px-3 py-2 rounded mt-1" style={{ color: 'var(--neutral-800)', backgroundColor: 'var(--neutral-200)' }}>
                  {caso.nombre_solicitante || '-'}
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--neutral-600)' }}>Identificación</label>
                <div className="px-3 py-2 rounded mt-1" style={{ color: 'var(--neutral-800)', backgroundColor: 'var(--neutral-200)' }}>
                  {caso.identificacion_solicitante || '-'}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs" style={{ color: 'var(--neutral-600)' }}>Dirección</label>
                <div className="px-3 py-2 rounded mt-1" style={{ color: 'var(--neutral-800)', backgroundColor: 'var(--neutral-200)' }}>
                  {caso.direccion_solicitante || '-'}
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--neutral-600)' }}>Teléfono</label>
                <div className="px-3 py-2 rounded mt-1" style={{ color: 'var(--neutral-800)', backgroundColor: 'var(--neutral-200)' }}>
                  {caso.telefono_solicitante || '-'}
                </div>
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--neutral-600)' }}>Email</label>
                <div className="px-3 py-2 rounded mt-1" style={{ color: 'var(--neutral-800)', backgroundColor: 'var(--neutral-200)' }}>
                  {caso.email_solicitante || '-'}
                </div>
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
              <span style={{ color: 'var(--color-warning-dark)' }}>
                Completa {validacion.bloqueantes_faltantes.length} campo(s) obligatorio(s)
              </span>
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

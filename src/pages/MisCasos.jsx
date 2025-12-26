import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import casoService from '../services/casoService';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import SolicitudReembolso from '../components/SolicitudReembolso';

export default function MisCasos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos, borrador, generado, finalizado
  const [busqueda, setBusqueda] = useState('');
  const [casoAEliminar, setCasoAEliminar] = useState(null);

  // Estados para solicitud de reembolso
  const [showModalReembolso, setShowModalReembolso] = useState(false);
  const [casoParaReembolso, setCasoParaReembolso] = useState(null);

  useEffect(() => {
    cargarCasos();
  }, []);

  // ✅ Marcar casos como vistos al entrar a la página
  useEffect(() => {
    const marcarVistos = async () => {
      try {
        await casoService.marcarCasosVistos();
      } catch (error) {
        console.error('Error marcando casos como vistos:', error);
      }
    };

    marcarVistos();
  }, []);

  const cargarCasos = async () => {
    try {
      setLoading(true);
      const data = await casoService.listarCasos();
      setCasos(data);
    } catch (error) {
      console.error('Error cargando casos:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!casoAEliminar) return;

    try {
      await casoService.eliminarCaso(casoAEliminar.id);
      toast.success('Caso eliminado exitosamente');
      cargarCasos();
      setCasoAEliminar(null);
    } catch (error) {
      console.error('Error eliminando caso:', error);
      toast.error('Error al eliminar el caso');
    }
  };

  const handleSolicitarReembolso = (caso) => {
    setCasoParaReembolso(caso);
    setShowModalReembolso(true);
  };

  const handleReembolsoSuccess = () => {
    toast.success('Solicitud de reembolso enviada exitosamente');
    setShowModalReembolso(false);
    setCasoParaReembolso(null);
    cargarCasos(); // Recargar para actualizar el estado
  };

  // Filtrar casos
  const casosFiltrados = casos.filter(caso => {
    // Filtro por estado
    if (filtro !== 'todos' && caso.estado !== filtro) {
      return false;
    }

    // Búsqueda por nombre o entidad
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const nombreMatch = caso.nombre_solicitante?.toLowerCase().includes(busquedaLower);
      const entidadMatch = caso.entidad_accionada?.toLowerCase().includes(busquedaLower);
      return nombreMatch || entidadMatch;
    }

    return true;
  });

  const getEstadoBadge = (estado) => {
    const estadoLower = estado?.toLowerCase();
    const badgeStyles = {
      borrador: { backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
      temporal: { backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
      generado: { backgroundColor: 'var(--color-success-light)', color: 'var(--color-success-dark)' },
      pagado: { backgroundColor: '#dcfce7', color: '#166534' }, // Verde oscuro
      finalizado: { backgroundColor: 'var(--color-info-light)', color: 'var(--color-info-dark)' },
      reembolsado: { backgroundColor: '#fee2e2', color: '#991b1b' }, // Rojo
    };
    const textos = {
      borrador: '📝 Borrador',
      temporal: '⏳ Temporal',
      generado: '✅ Generado',
      pagado: '💳 Pagado',
      finalizado: '🎯 Finalizado',
      reembolsado: '💸 Reembolsado',
    };

    const defaultStyle = { backgroundColor: 'var(--neutral-300)', color: 'var(--neutral-700)' };

    return (
      <span
        className="px-3 py-1 text-xs font-semibold rounded-full"
        style={badgeStyles[estadoLower] || defaultStyle}
      >
        {textos[estadoLower] || estado}
      </span>
    );
  };

  const getTipoDocumentoBadge = (tipo) => {
    if (tipo === 'tutela') {
      return (
        <span
          className="px-3 py-1 text-xs font-semibold rounded-full"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}
        >
          ⚖️ Tutela
        </span>
      );
    } else {
      return (
        <span
          className="px-3 py-1 text-xs font-semibold rounded-full"
          style={{ backgroundColor: 'var(--color-info-light)', color: 'var(--color-info-dark)' }}
        >
          📝 Derecho de Petición
        </span>
      );
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <p style={{ color: 'var(--neutral-600)' }}>Cargando casos...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--neutral-200)' }}
    >
      {/* Header */}
      <header
        className="shadow-sm"
        style={{
          backgroundColor: 'white',
          borderBottom: `1px solid var(--neutral-300)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: 'var(--neutral-800)' }}
              >
                Mis Casos
              </h1>
              <p
                className="text-sm mt-2"
                style={{ color: 'var(--neutral-600)' }}
              >
                {casosFiltrados.length} {casosFiltrados.length === 1 ? 'caso' : 'casos'} encontrados
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros y búsqueda */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="shadow rounded-lg p-6 mb-6"
          style={{
            backgroundColor: 'white',
            border: `1px solid var(--neutral-300)`,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <Input
              label="Buscar"
              type="text"
              placeholder="Buscar por nombre o entidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              leftIcon={
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />

            {/* Filtro por estado */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--neutral-700)' }}
              >
                Filtrar por estado
              </label>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--neutral-400)',
                  backgroundColor: 'white',
                  color: 'var(--neutral-800)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(11, 109, 255, 0.1)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--neutral-400)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="todos">Todos los estados</option>
                <option value="borrador">Borradores</option>
                <option value="generado">Generados</option>
                <option value="finalizado">Finalizados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de casos */}
        {casosFiltrados.length === 0 ? (
          <div
            className="shadow rounded-lg p-12 text-center"
            style={{ backgroundColor: 'white' }}
          >
            <div className="text-6xl mb-4">📁</div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: 'var(--neutral-800)' }}
            >
              No hay casos
            </h3>
            <p
              className="mb-6"
              style={{ color: 'var(--neutral-600)' }}
            >
              {busqueda || filtro !== 'todos'
                ? 'No se encontraron casos con los filtros aplicados'
                : 'Aún no has creado ningún caso. Los casos se crean mediante sesiones con el avatar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {casosFiltrados.map((caso) => (
              <div
                key={caso.id}
                className="shadow rounded-lg p-6 transition-all duration-200 animate-fadeIn hover-lift"
                style={{
                  backgroundColor: 'white',
                  border: `1px solid var(--neutral-300)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--neutral-300)';
                }}
              >
                <div className="flex justify-between items-start">
                  {/* Información del caso */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: 'var(--neutral-800)' }}
                      >
                        {caso.nombre_solicitante || 'Sin nombre'}
                      </h3>
                      {getTipoDocumentoBadge(caso.tipo_documento)}
                      {getEstadoBadge(caso.estado)}
                    </div>

                    <div
                      className="text-sm space-y-1"
                      style={{ color: 'var(--neutral-600)' }}
                    >
                      {caso.entidad_accionada && (
                        <p>
                          <strong style={{ color: 'var(--neutral-700)' }}>Entidad accionada:</strong> {caso.entidad_accionada}
                        </p>
                      )}
                      <p>
                        <strong style={{ color: 'var(--neutral-700)' }}>Creado:</strong> {formatearFecha(caso.created_at)}
                      </p>
                      <p>
                        <strong style={{ color: 'var(--neutral-700)' }}>Última actualización:</strong> {formatearFecha(caso.updated_at)}
                      </p>

                      {/* Estado de documento y reembolso */}
                      {caso.documento_desbloqueado && caso.estado?.toLowerCase() !== 'reembolsado' && (
                        <p>
                          <strong style={{ color: 'var(--neutral-700)' }}>Documento:</strong>{' '}
                          <span style={{ color: 'var(--color-success)' }}>Desbloqueado (Pagado)</span>
                        </p>
                      )}

                      {/* Reembolso pendiente de revisión - ahora fecha_reembolso no se resetea al re-solicitar */}
                      {caso.reembolso_solicitado && caso.estado?.toLowerCase() !== 'reembolsado' && (
                        <p style={{ color: 'var(--color-warning)' }}>
                          <strong>⏳ Reembolso en revisión</strong>
                          {caso.fecha_reembolso && (
                            <span style={{ display: 'block', fontSize: '0.875rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              (Re-solicitud)
                            </span>
                          )}
                        </p>
                      )}

                      {/* Reembolso rechazado */}
                      {!caso.reembolso_solicitado && caso.fecha_reembolso && caso.estado?.toLowerCase() !== 'reembolsado' && (
                        <p style={{ color: 'var(--color-error)' }}>
                          <strong>❌ Reembolso rechazado</strong>
                          {caso.comentario_admin_reembolso && (
                            <span style={{ display: 'block', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                              Razón: {caso.comentario_admin_reembolso}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/app/tutela/${caso.id}?mode=view`)}
                      leftIcon={
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      }
                    >
                      Ver
                    </Button>

                    {/* Botón de reembolso (solo si está pagado y puede solicitar) */}
                    {(() => {
                      const estaPagado = caso.documento_desbloqueado || caso.estado?.toLowerCase() === 'pagado';
                      const estaReembolsado = caso.estado?.toLowerCase() === 'reembolsado';
                      const tieneSolicitudPendiente = caso.reembolso_solicitado && !caso.fecha_reembolso;
                      const puedeVolverASolicitar = !caso.reembolso_solicitado && caso.fecha_reembolso && !estaReembolsado; // Fue rechazado
                      const nuncaSolicito = !caso.reembolso_solicitado && !caso.fecha_reembolso;

                      const puedeSolicitar = estaPagado && !estaReembolsado && (nuncaSolicito || puedeVolverASolicitar) && !tieneSolicitudPendiente;

                      return puedeSolicitar ? (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleSolicitarReembolso(caso)}
                          leftIcon={
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          }
                        >
                          {puedeVolverASolicitar ? 'Solicitar de Nuevo' : 'Reembolso'}
                        </Button>
                      ) : null;
                    })()}

                    <Button
                      variant="error"
                      size="sm"
                      onClick={() => setCasoAEliminar(caso)}
                      leftIcon={
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      }
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={!!casoAEliminar}
        onClose={() => setCasoAEliminar(null)}
        title="Confirmar eliminación"
        size="sm"
        footer={
          <>
            <Button
              variant="neutral"
              onClick={() => setCasoAEliminar(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="error"
              onClick={confirmarEliminar}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--neutral-700)' }}>
          ¿Estás seguro de que deseas eliminar el caso de{' '}
          <strong style={{ color: 'var(--neutral-900)' }}>
            {casoAEliminar?.nombre_solicitante || 'este usuario'}
          </strong>
          ?
        </p>
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--color-error)' }}
        >
          Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* Modal de solicitud de reembolso */}
      {casoParaReembolso && (
        <SolicitudReembolso
          isOpen={showModalReembolso}
          casoId={casoParaReembolso.id}
          caso={casoParaReembolso}
          onSuccess={handleReembolsoSuccess}
          onCancel={() => {
            setShowModalReembolso(false);
            setCasoParaReembolso(null);
          }}
        />
      )}
    </div>
  );
}

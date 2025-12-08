import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import casoService from '../services/casoService';

export default function MisCasos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos, borrador, generado, finalizado
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarCasos();
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

  const handleEliminar = async (casoId, nombreSolicitante) => {
    if (!window.confirm(`¿Estás seguro de eliminar el caso de ${nombreSolicitante}?`)) {
      return;
    }

    try {
      await casoService.eliminarCaso(casoId);
      alert('Caso eliminado exitosamente');
      cargarCasos();
    } catch (error) {
      console.error('Error eliminando caso:', error);
      alert('Error al eliminar el caso');
    }
  };

  const handleVolver = () => {
    navigate('/app/dashboard');
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
    const badges = {
      borrador: 'bg-yellow-100 text-yellow-800',
      generado: 'bg-green-100 text-green-800',
      finalizado: 'bg-blue-100 text-blue-800',
    };
    const textos = {
      borrador: '📝 Borrador',
      generado: '✅ Generado',
      finalizado: '🎯 Finalizado',
    };

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badges[estado] || 'bg-gray-100 text-gray-800'}`}>
        {textos[estado] || estado}
      </span>
    );
  };

  const getTipoDocumento = (tipo) => {
    return tipo === 'tutela' ? '⚖️ Tutela' : '📄 Derecho de Petición';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando casos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Casos</h1>
            <p className="text-sm text-gray-500 mt-1">
              {casosFiltrados.length} {casosFiltrados.length === 1 ? 'caso' : 'casos'} encontrados
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleVolver}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Volver
            </button>
            <button
              onClick={() => navigate('/app/tutela/nueva')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              + Nueva Tutela
            </button>
          </div>
        </div>
      </header>

      {/* Filtros y búsqueda */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o entidad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por estado
              </label>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay casos
            </h3>
            <p className="text-gray-600 mb-6">
              {busqueda || filtro !== 'todos'
                ? 'No se encontraron casos con los filtros aplicados'
                : 'Aún no has creado ningún caso. Crea tu primera tutela para comenzar.'}
            </p>
            {!busqueda && filtro === 'todos' && (
              <button
                onClick={() => navigate('/app/tutela/nueva')}
                className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Crear Primera Tutela
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {casosFiltrados.map((caso) => (
              <div
                key={caso.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  {/* Información del caso */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {caso.nombre_solicitante || 'Sin nombre'}
                      </h3>
                      {getEstadoBadge(caso.estado)}
                      <span className="text-sm text-gray-500">
                        {getTipoDocumento(caso.tipo_documento)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      {caso.entidad_accionada && (
                        <p>
                          <strong>Entidad accionada:</strong> {caso.entidad_accionada}
                        </p>
                      )}
                      <p>
                        <strong>Creado:</strong> {formatearFecha(caso.created_at)}
                      </p>
                      <p>
                        <strong>Última actualización:</strong> {formatearFecha(caso.updated_at)}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/app/tutela/${caso.id}`)}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                      title="Ver y editar"
                    >
                      👁️ Ver
                    </button>
                    <button
                      onClick={() => handleEliminar(caso.id, caso.nombre_solicitante)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                      title="Eliminar caso"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

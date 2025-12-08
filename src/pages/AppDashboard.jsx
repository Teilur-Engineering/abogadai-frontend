import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AppDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Abogadai</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.nombre} {user?.apellido}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Bienvenido a Abogadai!
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Aquí podrás crear tus tutelas y derechos de petición con ayuda de IA
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Card: Nueva Tutela */}
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nueva Tutela
              </h3>
              <p className="text-gray-600 mb-4">
                Crea una nueva acción de tutela para proteger tus derechos fundamentales
              </p>
              <button
                onClick={() => navigate('/app/tutela/nueva')}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Crear Tutela
              </button>
              <p className="text-xs text-green-600 font-semibold mt-2">
                ✓ Fase 2 completada
              </p>
            </div>

            {/* Card: Sesión con Avatar */}
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🎭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Asistente con Avatar
              </h3>
              <p className="text-gray-600 mb-4">
                Habla con nuestro asistente virtual con avatar para asesoría legal
              </p>
              <button
                onClick={() => navigate('/app/avatar')}
                className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Iniciar sesión
              </button>
              <p className="text-xs text-green-600 font-semibold mt-2">
                ✓ Fase 6 completada
              </p>
            </div>

            {/* Card: Mis Casos */}
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Mis Casos
              </h3>
              <p className="text-gray-600 mb-4">
                Ver historial de todos mis documentos y casos guardados
              </p>
              <button
                onClick={() => navigate('/app/casos')}
                className="w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Ver casos
              </button>
              <p className="text-xs text-green-600 font-semibold mt-2">
                ✓ Fase 5 completada
              </p>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 className="text-lg font-semibold text-green-900 mb-2">
              🎉 ¡Proyecto Completo!
            </h4>
            <p className="text-sm text-green-700">
              <strong>✓ Fase 1:</strong> Sistema de autenticación con JWT
              <br />
              <strong>✓ Fase 2:</strong> Formulario de tutela con autoguardado de borradores
              <br />
              <strong>✓ Fase 3:</strong> Generación de documentos con GPT-4
              <br />
              <strong>✓ Fase 4:</strong> Edición y descarga en PDF/DOCX
              <br />
              <strong>✓ Fase 5:</strong> Historial de casos con búsqueda y filtros
              <br />
              <strong>✓ Fase 6:</strong> Avatar legal con IA en tiempo real
              <br />
              <br />
              <strong>Abogadai está 100% funcional y listo para usar! 🚀</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

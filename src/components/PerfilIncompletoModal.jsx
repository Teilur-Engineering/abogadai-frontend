import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import perfilService from '../services/perfilService';

export default function PerfilIncompletoModal({ mostrar, onComplete }) {
  const navigate = useNavigate();
  const [estadoPerfil, setEstadoPerfil] = useState(null);

  useEffect(() => {
    if (mostrar) {
      cargarEstadoPerfil();
    }
  }, [mostrar]);

  const cargarEstadoPerfil = async () => {
    try {
      const estado = await perfilService.verificarEstado();
      setEstadoPerfil(estado);
    } catch (error) {
      console.error('Error cargando estado perfil:', error);
    }
  };

  const handleCompletarAhora = () => {
    navigate('/perfil');
  };

  if (!mostrar || !estadoPerfil || estadoPerfil.completo) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Completa tu Perfil</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Antes de crear tu primer caso, necesitamos que completes tu perfil con la siguiente información:
          </p>

          <ul className="space-y-2">
            {estadoPerfil.campos_faltantes.map(campo => (
              <li key={campo} className="flex items-center text-sm text-gray-600">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {campo === 'identificacion' ? 'Cédula / NIT' :
                 campo === 'direccion' ? 'Dirección' :
                 campo === 'telefono' ? 'Teléfono' : campo}
              </li>
            ))}
          </ul>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              Solo necesitas completar estos datos una vez. Se auto-llenarán en todos tus casos nuevos.
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleCompletarAhora}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Completar Mi Perfil
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Perfil() {
  const { user, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [erroresValidacion, setErroresValidacion] = useState({});

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    identificacion: '',
    direccion: '',
    telefono: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        identificacion: user.identificacion || '',
        direccion: user.direccion || '',
        telefono: user.telefono || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (erroresValidacion[name]) {
      setErroresValidacion(prev => {
        const nuevos = { ...prev };
        delete nuevos[name];
        return nuevos;
      });
    }
  };

  const validarCampo = async (campo, valor) => {
    if (!valor || valor.trim() === '') return null;

    try {
      if (campo === 'identificacion') {
        const cedulaRes = await api.get(`/api/referencias/validar/cedula/${valor}`);
        if (cedulaRes.data.es_valida) {
          return { tipo: 'success', mensaje: `Cédula válida: ${cedulaRes.data.cedula_formateada}` };
        }

        const nitRes = await api.get(`/api/referencias/validar/nit/${valor}`);
        if (nitRes.data.es_valido) {
          return { tipo: 'success', mensaje: `NIT válido: ${nitRes.data.nit_formateado}` };
        }

        return { tipo: 'error', mensaje: 'Identificación inválida' };
      }

      if (campo === 'telefono') {
        const telRes = await api.get(`/api/referencias/validar/telefono/${valor}`);
        if (telRes.data.es_valido) {
          return { tipo: 'success', mensaje: `Teléfono válido: ${telRes.data.telefono_formateado}` };
        }
        return { tipo: 'error', mensaje: telRes.data.razon || 'Teléfono inválido' };
      }
    } catch (error) {
      console.error('Error validando:', error);
    }
    return null;
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    const resultado = await validarCampo(name, value);
    if (resultado) {
      setErroresValidacion(prev => ({ ...prev, [name]: resultado }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    try {
      await updateUserProfile(formData);
      setMensaje({ tipo: 'success', texto: 'Perfil actualizado exitosamente' });
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.detail || 'Error actualizando perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>

      {mensaje && (
        <div className={`mb-4 p-4 rounded ${
          mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Datos Personales</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cédula / NIT *
              </label>
              <input
                type="text"
                name="identificacion"
                value={formData.identificacion}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                placeholder="12345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {erroresValidacion.identificacion && (
                <p className={`mt-1 text-sm ${
                  erroresValidacion.identificacion.tipo === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {erroresValidacion.identificacion.mensaje}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                placeholder="3001234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {erroresValidacion.telefono && (
                <p className={`mt-1 text-sm ${
                  erroresValidacion.telefono.tipo === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {erroresValidacion.telefono.mensaje}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección Completa *
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                required
                placeholder="Calle 123 # 45-67, Bogotá"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">¿Por qué necesitamos estos datos?</h3>
        <p className="text-sm text-blue-800">
          Estos datos se utilizarán automáticamente en todos tus casos nuevos para evitar que
          tengas que ingresarlos cada vez. Puedes modificarlos temporalmente en cada caso si lo necesitas.
        </p>
      </div>
    </div>
  );
}

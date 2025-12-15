import api from './api';

const perfilService = {
  /**
   * Obtiene el perfil del usuario actual
   */
  async obtenerPerfil() {
    const response = await api.get('/api/perfil/');
    return response.data;
  },

  /**
   * Verifica el estado del perfil (qué campos faltan)
   */
  async verificarEstado() {
    const response = await api.get('/api/perfil/estado');
    return response.data;
  },

  /**
   * Actualiza el perfil del usuario
   */
  async actualizarPerfil(datos) {
    const response = await api.put('/api/perfil/', datos);
    return response.data;
  },

  /**
   * Completa el perfil por primera vez
   */
  async completarPerfil(datos) {
    const response = await api.post('/api/perfil/completar', datos);
    return response.data;
  },
};

export default perfilService;

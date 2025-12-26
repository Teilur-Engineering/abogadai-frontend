import api from './api';

export const casoService = {
  async crearCaso(casoData) {
    try {
      const response = await api.post('/casos/', casoData);
      return response.data;
    } catch (error) {
      console.error('Error creando caso:', error);
      throw error;
    }
  },

  async listarCasos() {
    try {
      const response = await api.get('/casos/');
      return response.data;
    } catch (error) {
      console.error('Error listando casos:', error);
      throw error;
    }
  },

  async obtenerCaso(casoId) {
    try {
      const response = await api.get(`/casos/${casoId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo caso:', error);
      throw error;
    }
  },

  async actualizarCaso(casoId, casoData) {
    try {
      const response = await api.put(`/casos/${casoId}`, casoData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando caso:', error);
      throw error;
    }
  },

  async eliminarCaso(casoId) {
    try {
      await api.delete(`/casos/${casoId}`);
    } catch (error) {
      console.error('Error eliminando caso:', error);
      throw error;
    }
  },

  async procesarTranscripcion(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/procesar-transcripcion`);
      return response.data;
    } catch (error) {
      console.error('Error procesando transcripción:', error);
      throw error;
    }
  },

  async validarCaso(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/validar`);
      return response.data;
    } catch (error) {
      console.error('Error validando caso:', error);
      throw error;
    }
  },

  async generarDocumento(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/generar`);
      return response.data;
    } catch (error) {
      console.error('Error generando documento:', error);
      throw error;
    }
  },

  async descargarPDF(casoId) {
    try {
      const response = await api.get(`/casos/${casoId}/descargar/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error descargando PDF:', error);
      throw error;
    }
  },

  /**
   * NUEVO: Obtener mensajes de la conversación del caso
   */
  async obtenerMensajes(casoId) {
    try {
      const response = await api.get(`/mensajes/caso/${casoId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      throw error;
    }
  },

  /**
   * Obtener documento con preview/full según estado de pago
   */
  async obtenerDocumento(casoId) {
    try {
      const response = await api.get(`/casos/${casoId}/documento`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo documento:', error);
      throw error;
    }
  },

  /**
   * Simular pago y desbloquear documento
   */
  async simularPago(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/simular-pago`);
      return response.data;
    } catch (error) {
      console.error('Error simulando pago:', error);
      throw error;
    }
  },

  /**
   * 🔔 Verificar si hay casos con novedades sin ver
   */
  async tieneNovedades() {
    try {
      const response = await api.get('/casos/tiene-novedades');
      return response.data;
    } catch (error) {
      console.error('Error verificando novedades:', error);
      throw error;
    }
  },

  /**
   * ✅ Marcar todos los casos como vistos
   */
  async marcarCasosVistos() {
    try {
      const response = await api.post('/casos/marcar-vistos');
      return response.data;
    } catch (error) {
      console.error('Error marcando casos como vistos:', error);
      throw error;
    }
  },
};

export default casoService;

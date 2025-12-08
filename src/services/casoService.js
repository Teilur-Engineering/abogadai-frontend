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

  async analizarFortaleza(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/analizar-fortaleza`);
      return response.data;
    } catch (error) {
      console.error('Error analizando fortaleza:', error);
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

  async descargarDOCX(casoId) {
    try {
      const response = await api.get(`/casos/${casoId}/descargar/docx`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error descargando DOCX:', error);
      throw error;
    }
  },
};

export default casoService;

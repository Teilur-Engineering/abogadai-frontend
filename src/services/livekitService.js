import api from './api';

export const livekitService = {
  async getToken() {
    try {
      const response = await api.post('/livekit/token');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo token de LiveKit:', error);
      throw error;
    }
  },
};

export default livekitService;

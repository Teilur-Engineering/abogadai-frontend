import api from './api';

export const authService = {
  async signup(userData) {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    const userData = response.data;
    // Guardar usuario completo en localStorage para acceso rápido
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Ignorar errores al hacer logout
    }
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Obtener usuario desde localStorage (sin hacer request)
  getCachedUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token, new_password) {
    const response = await api.post('/auth/reset-password', { token, new_password });
    return response.data;
  },

  async resendVerification(email) {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },
};

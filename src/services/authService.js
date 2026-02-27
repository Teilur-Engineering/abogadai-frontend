import api from './api';

export const authService = {
  async signup(userData) {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    const userData = response.data;
    // Guardar usuario completo en localStorage para acceso rápido
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Limpiar también el usuario
    window.location.href = '/login';
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
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
};

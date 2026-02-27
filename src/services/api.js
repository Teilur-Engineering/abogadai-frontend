import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Public routes where a 401 should NOT redirect to /login
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Inyectar token como Bearer en cada request (funciona en entornos cross-site
// donde las cookies SameSite=lax no se envían en peticiones AJAX)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p))
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

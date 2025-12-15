import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (authService.isAuthenticated()) {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        authService.logout();
      }
    }
    setLoading(false);
  };

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    const userData = await authService.getCurrentUser();
    setUser(userData);
    return data;
  };

  const signup = async (userData) => {
    const data = await authService.signup(userData);
    return data;
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  const updateUserProfile = async (profileData) => {
    try {
      const response = await api.put('/api/perfil/', profileData);
      setUser(response.data);  // Actualizar usuario en contexto
      return response.data;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error refrescando usuario:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUserProfile,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

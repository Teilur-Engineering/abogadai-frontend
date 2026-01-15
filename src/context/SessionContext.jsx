import { createContext, useContext, useState, useCallback } from 'react';
import casoService from '../services/casoService';
import livekitService from '../services/livekitService';

/**
 * Estados posibles de la sesión
 */
export const SESSION_STATES = {
  PRE_LLAMADA: 'PRE_LLAMADA',
  EN_SESION: 'EN_SESION',
  PROCESANDO: 'PROCESANDO',
  REVISION: 'REVISION'
};

const SessionContext = createContext(null);

/**
 * Provider del contexto de sesión.
 * Mantiene el estado global de la sesión para que otros componentes
 * (como Sidebar) puedan saber si hay una sesión activa.
 */
export function SessionProvider({ children }) {
  const [sessionState, setSessionState] = useState(SESSION_STATES.PRE_LLAMADA);
  const [casoId, setCasoId] = useState(null);
  const [isAbandonando, setIsAbandonando] = useState(false);

  /**
   * Verifica si hay una sesión activa (EN_SESION o REVISION)
   * En estos estados, el usuario no debería navegar sin confirmación
   */
  const haySessionActiva = useCallback(() => {
    return sessionState === SESSION_STATES.EN_SESION ||
           sessionState === SESSION_STATES.REVISION;
  }, [sessionState]);

  /**
   * Verifica si está en medio de una llamada
   */
  const estaEnLlamada = useCallback(() => {
    return sessionState === SESSION_STATES.EN_SESION;
  }, [sessionState]);

  /**
   * Verifica si está en revisión
   */
  const estaEnRevision = useCallback(() => {
    return sessionState === SESSION_STATES.REVISION;
  }, [sessionState]);

  /**
   * Actualiza el estado de la sesión
   */
  const actualizarEstado = useCallback((nuevoEstado) => {
    console.log(`🔄 SessionContext: Cambiando estado a ${nuevoEstado}`);
    setSessionState(nuevoEstado);
  }, []);

  /**
   * Establece el ID del caso actual
   */
  const establecerCasoId = useCallback((id) => {
    console.log(`📝 SessionContext: Estableciendo casoId = ${id}`);
    setCasoId(id);
  }, []);

  /**
   * Abandona la sesión actual: finaliza LiveKit y elimina el caso
   * Retorna true si se completó exitosamente
   */
  const abandonarSesion = useCallback(async () => {
    if (isAbandonando) return false;

    setIsAbandonando(true);
    console.log('🚪 SessionContext: Abandonando sesión...');

    try {
      if (casoId) {
        // Paso 1: Finalizar sesión de LiveKit (si está en llamada)
        if (sessionState === SESSION_STATES.EN_SESION) {
          console.log('📞 Finalizando sesión de LiveKit...');
          try {
            await livekitService.finalizarSesion(casoId);
            console.log('✅ Sesión de LiveKit finalizada');
          } catch (livekitError) {
            console.warn('⚠️ No se pudo finalizar LiveKit:', livekitError.message);
          }
        }

        // Paso 2: Eliminar el caso de la BD
        console.log('🗑️ Eliminando caso:', casoId);
        try {
          await casoService.eliminarCaso(casoId);
          console.log('✅ Caso eliminado exitosamente');
        } catch (deleteError) {
          if (deleteError.response?.status === 404) {
            console.log('ℹ️ El caso ya no existe');
          } else {
            console.warn('⚠️ No se pudo eliminar el caso:', deleteError.message);
          }
        }
      }

      // Paso 3: Resetear estado
      setCasoId(null);
      setSessionState(SESSION_STATES.PRE_LLAMADA);
      console.log('✅ Estado reseteado');

      return true;
    } catch (err) {
      console.error('❌ Error abandonando sesión:', err);
      // Resetear de todos modos
      setCasoId(null);
      setSessionState(SESSION_STATES.PRE_LLAMADA);
      return false;
    } finally {
      setIsAbandonando(false);
    }
  }, [casoId, sessionState, isAbandonando]);

  /**
   * Resetea el estado sin eliminar nada (para cuando se completa normalmente)
   */
  const resetearEstado = useCallback(() => {
    console.log('🔄 SessionContext: Reseteando estado (sin eliminar caso)');
    setCasoId(null);
    setSessionState(SESSION_STATES.PRE_LLAMADA);
  }, []);

  const value = {
    // Estado
    sessionState,
    casoId,
    isAbandonando,

    // Checkers
    haySessionActiva,
    estaEnLlamada,
    estaEnRevision,

    // Acciones
    actualizarEstado,
    establecerCasoId,
    abandonarSesion,
    resetearEstado,

    // Constantes
    SESSION_STATES
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de sesión
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de un SessionProvider');
  }
  return context;
}

export default SessionContext;

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

  /**
   * Inicia la generación y hace polling hasta que el documento esté listo.
   * @param {number} casoId
   * @param {function} onProgress - callback(caso) llamado en cada poll
   * @param {number} timeoutMs - timeout máximo en ms (default 120 000)
   * @returns {Promise<object>} caso con estado GENERADO
   */
  async generarDocumentoAsync(casoId, onProgress, timeoutMs = 120_000) {
    // Iniciar generación (202)
    const { data: casoInicial } = await api.post(`/casos/${casoId}/generar`);
    if (onProgress) onProgress(casoInicial);

    return new Promise((resolve, reject) => {
      const start = Date.now();

      const interval = setInterval(async () => {
        try {
          if (Date.now() - start > timeoutMs) {
            clearInterval(interval);
            reject(new Error('TIMEOUT'));
            return;
          }

          const { data: caso } = await api.get(`/casos/${casoId}`);
          if (onProgress) onProgress(caso);

          if (caso.estado === 'GENERADO') {
            clearInterval(interval);
            resolve(caso);
          } else if (caso.estado === 'ERROR_GENERACION') {
            clearInterval(interval);
            reject(new Error('ERROR_GENERACION'));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 2000);
    });
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
   * Desbloquear documento como administrador (sin pago real)
   * Solo funciona para usuarios con is_admin=true
   */
  async desbloquearComoAdmin(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/desbloquear-admin`);
      return response.data;
    } catch (error) {
      console.error('Error desbloqueando como admin:', error);
      throw error;
    }
  },

  /**
   * Iniciar pago con Vita Wallet
   * Retorna URL de checkout para redirigir al usuario
   *
   * @param {number} casoId - ID del caso a pagar
   * @returns {Promise<{payment_url: string, pago_id: number, monto: number}>}
   */
  async iniciarPagoVita(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/pago/iniciar`);
      return response.data;
    } catch (error) {
      console.error('Error iniciando pago Vita:', error);
      throw error;
    }
  },

  /**
   * Obtener estado del pago de un caso
   *
   * @param {number} casoId - ID del caso
   * @returns {Promise<{tiene_pago: boolean, estado: string, documento_desbloqueado: boolean}>}
   */
  async obtenerEstadoPago(casoId) {
    try {
      const response = await api.get(`/casos/${casoId}/pago/estado`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado de pago:', error);
      throw error;
    }
  },

  /**
   * Cancelar pago pendiente para permitir reintentar
   * Se usa cuando Vita redirige con error o cancelado
   *
   * @param {number} casoId - ID del caso
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async cancelarPagoPendiente(casoId) {
    try {
      const response = await api.post(`/casos/${casoId}/pago/cancelar`);
      return response.data;
    } catch (error) {
      console.error('Error cancelando pago pendiente:', error);
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

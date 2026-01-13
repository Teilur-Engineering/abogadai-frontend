import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, useTracks, useLocalParticipant, useRemoteParticipants, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import livekitService from '../services/livekitService';
import casoService from '../services/casoService';
import { useAuth } from '../context/AuthContext';
import { useSessionState, SESSION_STATES } from '../hooks/useSessionState';
import TranscriptPanel from '../components/TranscriptPanel';
import RevisionRapida from '../components/RevisionRapida';
// ModalConfirmarSesion eliminado - ahora inicia automáticamente

// Componente para detectar participantes remotos (avatar)
function AvatarDetector({ onAvatarConnected }) {
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    const isConnected = remoteParticipants.length > 0;
    onAvatarConnected?.(isConnected);
  }, [remoteParticipants, onAvatarConnected]);

  return null;
}

// Componente para controles de audio
function AudioControls({ isMuted, onToggleMute, onMicActivity, isEnabled }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(isEnabled && !isMuted);
    }
  }, [isMuted, localParticipant, isEnabled]);

  useEffect(() => {
    if (!localParticipant) return;

    const handleSpeakingChange = (speaking) => {
      onMicActivity?.(speaking);
    };

    localParticipant.on('isSpeakingChanged', handleSpeakingChange);

    return () => {
      localParticipant.off('isSpeakingChanged', handleSpeakingChange);
    };
  }, [localParticipant, onMicActivity]);

  return null;
}

// Componente del video del avatar
function VideoComponent({ onSpeakingChange, isSpeaking: isAvatarSpeaking }) {
  const tracks = useTracks([Track.Source.Camera]);
  const videoRef = useRef(null);

  useEffect(() => {
    if (tracks.length > 0 && tracks[0]?.participant) {
      const participant = tracks[0].participant;

      const handleSpeakingChange = (speaking) => {
        onSpeakingChange?.(speaking);
      };

      participant.on('isSpeakingChanged', handleSpeakingChange);

      return () => {
        participant.off('isSpeakingChanged', handleSpeakingChange);
      };
    }
  }, [tracks, onSpeakingChange]);

  if (tracks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-800 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-neutral-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm">Esperando al avatar...</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={(ref) => {
        videoRef.current = ref;
        if (ref && tracks[0]?.publication?.track) {
          tracks[0].publication.track.attach(ref);
        }
      }}
      className="w-full h-full object-cover rounded-lg"
      autoPlay
      playsInline
    />
  );
}

/**
 * AvatarSession - Pantalla principal con máquina de estados
 *
 * Estados (según plan.md):
 * A) PRE_LLAMADA: Listo para iniciar, sin conexión LiveKit
 * B) EN_SESION: Conectado a LiveKit, conversación activa
 * C) PROCESANDO: Procesando transcripción con IA
 * D) REVISION: Revisión rápida de datos + generación de documento
 */
export default function AvatarSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessionState = useSessionState();
  const isInitializingRef = useRef(false);

  // Estados del componente
  const [casoId, setCasoId] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isAvatarConnected, setIsAvatarConnected] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(2 * 60); // ⚠️ TEMPORAL: 2 min para pruebas (cambiar a 15 * 60 en producción)
  const [conversacion, setConversacion] = useState([]);
  const videoContainerRef = useRef(null);

  // Modal de confirmación eliminado - ahora inicia directamente

  // Estados para video de bienvenida
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  const welcomeVideoRef = useRef(null);
  const videoScheduledRef = useRef(false); // Protección contra StrictMode

  // Inicializar: NO crear caso aún, solo mostrar pantalla Pre-llamada
  useEffect(() => {
    // El caso se creará cuando el usuario presione "Iniciar Sesión"
    sessionState.goToPreLlamada();
  }, []);

  // Reproducir video de bienvenida (solo si viene de login, no en recargas)
  useEffect(() => {
    // Verificar si viene de login
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    const alreadyScheduled = videoScheduledRef.current;

    console.log('🎬 Verificando video de bienvenida...');
    console.log(`   Estado: ${sessionState.isPreLlamada ? 'PRE_LLAMADA' : 'OTRO'}`);
    console.log(`   Flag de login: ${justLoggedIn}`);
    console.log(`   Ya programado: ${alreadyScheduled}`);

    if (sessionState.isPreLlamada && justLoggedIn === 'true' && !alreadyScheduled) {
      console.log('✅ Usuario acaba de hacer LOGIN → Programar video');

      // Marcar como programado PRIMERO (protege contra StrictMode double-render)
      videoScheduledRef.current = true;

      // Esperar 2 segundos y mostrar video
      const timer = setTimeout(() => {
        console.log('🎬 Activando video ahora...');
        setShowWelcomeVideo(true);
        // Limpiar flag AQUÍ, solo cuando el video se ha activado
        sessionStorage.removeItem('justLoggedIn');
        console.log('🧹 Flag de login limpiada');
      }, 2000);

      return () => {
        // Limpiar timer
        clearTimeout(timer);
        // Si el componente se desmonta antes de mostrar el video, resetear la ref
        // Esto permite que se reintente en el siguiente mount (StrictMode)
        if (!showWelcomeVideo) {
          console.log('🔄 Cleanup: Video no se mostró, reseteando ref para reintentar');
          videoScheduledRef.current = false;
        }
      };
    } else {
      console.log('⏭️ NO reproducir video');
      if (!justLoggedIn) console.log('   Razón: No viene de login');
      if (alreadyScheduled) console.log('   Razón: Ya fue programado');
    }
  }, [sessionState.isPreLlamada]);

  // Reproducir video cuando se muestre
  useEffect(() => {
    if (showWelcomeVideo && welcomeVideoRef.current) {
      console.log('▶️ Video montado en el DOM, intentando reproducir...');
      const video = welcomeVideoRef.current;

      // Asegurar que tiene volumen
      video.volume = 1.0;
      video.muted = false;

      console.log('🔊 Configuración de video:');
      console.log(`   - Volume: ${video.volume}`);
      console.log(`   - Muted: ${video.muted}`);

      // Intentar reproducir
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅✅✅ Video reproduciéndose CON AUDIO exitosamente!');
          })
          .catch(err => {
            console.error('❌ Error al reproducir video:', err.name);
            console.error('   Mensaje:', err.message);
            console.error('   Esto puede pasar si el navegador bloquea autoplay con audio');
            console.error('   Solución: El video solo se reproduce en el primer inicio de sesión');
          });
      }
    }
  }, [showWelcomeVideo]);

  // Contador de tiempo de sesión con límite ⚠️ TEMPORAL: 2 minutos para pruebas (15 min en producción)
  useEffect(() => {
    if (!sessionState.isEnSesion || !isAvatarConnected) return;

    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
      setTimeRemaining(prev => {
        const newTime = prev - 1;

        // Cuando el tiempo se agota completamente (0 segundos)
        if (newTime <= 0) {
          console.log('⏱️ Tiempo agotado - Finalizando sesión automáticamente');
          handleFinalizarSesion();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState.isEnSesion, isAvatarConnected]);


  // Formatear tiempo de sesión
  const formatSessionTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear tiempo restante
  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determinar color del tiempo restante
  const getTimeRemainingColor = (seconds) => {
    if (seconds <= 60) return 'var(--color-error)'; // Rojo último minuto
    if (seconds <= 180) return 'var(--color-warning)'; // Amarillo últimos 3 min
    return 'var(--color-success)'; // Verde normal
  };

  // Handler: Iniciar sesión directamente (crear caso + conectar a LiveKit)
  const handleConfirmarIniciarSesion = async () => {

    try {
      console.log('🚀 Paso 1: Creando caso...');
      const casoData = await livekitService.iniciarSesion();
      const nuevoCasoId = casoData.caso_id;
      setCasoId(nuevoCasoId);
      console.log('✅ Caso creado:', nuevoCasoId);

      console.log('🔌 Paso 2: Conectando a LiveKit...');
      const tokenData = await livekitService.conectarSesion(nuevoCasoId);
      console.log('✅ Token obtenido');

      // Resetear timers y estados
      setSessionTime(0);
      setTimeRemaining(2 * 60); // ⚠️ TEMPORAL: 2 min para pruebas (cambiar a 15 * 60 en producción)

      sessionState.goToEnSesion(tokenData);
    } catch (err) {
      console.error('❌ Error iniciando sesión:', err);
      sessionState.setStateError('Error al iniciar sesión. Por favor intenta de nuevo.');
    }
  };

  // Handler: Finalizar sesión
  const handleFinalizarSesion = async () => {
    if (!casoId) return;

    try {
      sessionState.goToProcesando();

      console.log('🔚 Finalizando sesión...');
      await livekitService.finalizarSesion(casoId);

      console.log('🤖 Procesando transcripción con IA...');
      const casoActualizado = await casoService.procesarTranscripcion(casoId);

      console.log('📥 Cargando conversación...');
      const mensajes = await casoService.obtenerMensajes(casoId);
      setConversacion(mensajes);

      console.log('✅ Pasando a revisión');
      sessionState.goToRevision(casoActualizado);
    } catch (err) {
      console.error('❌ Error finalizando sesión:', err);
      sessionState.setStateError('Error procesando la conversación.');
    }
  };

  // Handler: Abandonar llamada (eliminar caso y salir)
  const handleAbandonarLlamada = async () => {
    try {
      console.log('🚪 Abandonando llamada...');

      if (casoId) {
        // Paso 1: Finalizar sesión de LiveKit (colgar la llamada)
        console.log('📞 Finalizando sesión de LiveKit...');
        try {
          await livekitService.finalizarSesion(casoId);
          console.log('✅ Sesión de LiveKit finalizada');
        } catch (livekitError) {
          // Si falla, no bloquear el flujo
          console.warn('⚠️ No se pudo finalizar la sesión de LiveKit:', livekitError.message);
        }

        // Paso 2: Eliminar el caso
        console.log('🗑️ Intentando eliminar caso:', casoId);
        try {
          await casoService.eliminarCaso(casoId);
          console.log('✅ Caso eliminado exitosamente');
        } catch (deleteError) {
          // Si el caso no existe (404), no es un error crítico
          if (deleteError.response?.status === 404) {
            console.log('ℹ️ El caso ya no existe en la base de datos');
          } else {
            console.warn('⚠️ No se pudo eliminar el caso:', deleteError.message);
          }
        }
      }

      // Paso 3: Resetear el estado de la sesión a PRE_LLAMADA
      console.log('🔄 Reseteando estado de sesión...');
      sessionState.reset();
      console.log('✅ Estado reseteado - Volviendo a pantalla inicial');

      // Nota: No necesitamos navigate() porque ya estamos en /app/avatar
      // El reset() hace que se muestre la pantalla PRE_LLAMADA automáticamente
    } catch (err) {
      console.error('❌ Error abandonando llamada:', err);
      // Resetear de todos modos e intentar volver a la interfaz principal
      sessionState.reset();
    }
  };

  // Handler: Actualizar caso después de edición
  const handleCasoUpdated = (casoActualizado) => {
    sessionState.updateCasoData(casoActualizado);
  };

  // Handler: Documento generado
  const handleDocumentoGenerado = (casoConDocumento) => {
    sessionState.updateCasoData(casoConDocumento);
    console.log('✅ Documento generado exitosamente');
  };

  // Toggle mute
  const toggleMute = () => {
    if (!isAvatarConnected) return;
    setIsMuted(!isMuted);
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' && isAvatarConnected) {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted, isAvatarConnected]);

  // Error state
  if (sessionState.error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="p-8 rounded-lg max-w-md" style={{ backgroundColor: 'var(--color-error-dark)', color: 'white' }}>
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="mb-4">{sessionState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full text-white py-2 px-4 rounded"
            style={{ backgroundColor: 'var(--color-error)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error)'}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--neutral-200)' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{
          backgroundColor: 'white',
          borderColor: 'var(--neutral-300)',
        }}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--neutral-800)' }}
            >
              Asistente Legal
            </h1>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--neutral-600)' }}
            >
              {sessionState.isPreLlamada && 'Listo para iniciar tu sesión'}
              {sessionState.isEnSesion && 'Sesión activa'}
              {sessionState.isProcesando && 'Procesando tu conversación...'}
              {sessionState.isRevision && 'Revisión y generación de documento'}
            </p>
          </div>

          {/* Estado indicator */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--neutral-200)' }}
          >
            {sessionState.isPreLlamada && (
              <>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--neutral-400)' }}
                ></div>
                <span
                  className="text-sm"
                  style={{ color: 'var(--neutral-700)' }}
                >
                  Pre-llamada
                </span>
              </>
            )}
            {sessionState.isEnSesion && (
              <>
                <div
                  className={`w-2 h-2 rounded-full ${timeRemaining <= 60 ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: getTimeRemainingColor(timeRemaining) }}
                ></div>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: getTimeRemainingColor(timeRemaining) }}
                  title={`Tiempo transcurrido: ${formatSessionTime(sessionTime)}`}
                >
                  {formatTimeRemaining(timeRemaining)} restantes
                </span>
              </>
            )}
            {sessionState.isProcesando && (
              <>
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--color-warning)' }}
                ></div>
                <span
                  className="text-sm"
                  style={{ color: 'var(--neutral-800)' }}
                >
                  Procesando
                </span>
              </>
            )}
            {sessionState.isRevision && (
              <>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                ></div>
                <span
                  className="text-sm"
                  style={{ color: 'var(--neutral-800)' }}
                >
                  Revisión
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal según estado */}
      <div className="flex-1 overflow-hidden">
        {/* ESTADO A: PRE-LLAMADA */}
        {sessionState.isPreLlamada && (
          <div className="h-full overflow-y-auto flex flex-col items-center justify-start p-8 py-12">
            <div className="max-w-xl text-center animate-fadeIn">
              <div
                className="relative mx-auto mb-6 rounded-full flex items-center justify-center animate-pulse-soft"
                style={{
                  width: '180px',
                  height: '180px',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                  boxShadow: '0 12px 48px rgba(11, 109, 255, 0.4), 0 0 80px rgba(11, 109, 255, 0.25)',
                  padding: '5px'
                }}
              >
                <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                  {/* Video de bienvenida */}
                  {showWelcomeVideo && (
                    <video
                      ref={welcomeVideoRef}
                      src="/assets/video_saludo_sofia.mp4"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: 'center',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 2
                      }}
                      playsInline
                      preload="auto"
                      onEnded={() => {
                        console.log('🎬 Video terminado, mostrando imagen');
                        setShowWelcomeVideo(false);
                      }}
                      onError={(e) => {
                        console.error('❌ Error cargando video:', e);
                        setShowWelcomeVideo(false);
                      }}
                    />
                  )}

                  {/* Imagen estática (se muestra cuando no hay video) */}
                  <img
                    src="/assets/sofia-avatar.avif"
                    alt="Sofía - Asistente Legal"
                    className="w-full h-full object-cover animate-breathe"
                    style={{
                      objectPosition: 'center',
                      opacity: showWelcomeVideo ? 0 : 1,
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                  />

                  {/* Indicador de disponibilidad (solo cuando NO hay video) */}
                  {!showWelcomeVideo && (
                    <div
                      className="absolute bottom-1 right-1 rounded-full border-3 border-white animate-pulse"
                      style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'var(--color-success)',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                        zIndex: 3
                      }}
                      title="Disponible"
                    ></div>
                  )}
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--neutral-800)' }}>
                Hola {user?.nombre}, bienvenido
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                Soy Sofía, tu asistente legal
              </p>
              <p className="mb-6 text-base leading-relaxed" style={{ color: 'var(--neutral-600)' }}>
                Estoy lista para ayudarte a crear tu tutela o derecho de petición.
                Presiona el botón para iniciar la conversación.
              </p>

              <button
                onClick={handleConfirmarIniciarSesion}
                className="font-bold py-3 px-8 rounded-lg text-base transition-all duration-300 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(11, 109, 255, 0.35)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(11, 109, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(11, 109, 255, 0.35)';
                }}
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        )}

        {/* ESTADO B: EN SESIÓN */}
        {sessionState.isEnSesion && sessionState.livekitToken && (
          <LiveKitRoom
            token={sessionState.livekitToken}
            serverUrl={sessionState.livekitUrl}
            connect={true}
            audio={true}
            video={false}
            className="h-full flex flex-col overflow-hidden"
          >
            <AvatarDetector onAvatarConnected={setIsAvatarConnected} />
            <AudioControls
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onMicActivity={setIsSpeaking}
              isEnabled={isAvatarConnected}
            />

            <div className="flex-1 flex gap-4 overflow-hidden p-6" ref={videoContainerRef}>
              {/* Panel de Videos (65%) */}
              <div className="w-[65%] flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 flex-1">
                  {/* Avatar */}
                  <div
                    className={`relative bg-neutral-800 rounded-lg overflow-hidden transition-all duration-300 ${
                      isAvatarSpeaking ? 'ring-4 ring-primary shadow-lg' : 'ring-2 ring-neutral-700'
                    }`}
                    style={isAvatarSpeaking ? { boxShadow: '0 0 20px rgba(11, 109, 255, 0.5)' } : {}}
                  >
                    <VideoComponent onSpeakingChange={setIsAvatarSpeaking} isSpeaking={isAvatarSpeaking} />
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}>
                      Sofía - Asistente Legal
                    </div>
                  </div>

                  {/* Usuario */}
                  <div
                    className={`relative bg-gradient-to-br rounded-lg overflow-hidden transition-all duration-300 flex items-center justify-center ${
                      isSpeaking ? 'ring-4 shadow-lg' : 'ring-2 ring-neutral-700'
                    }`}
                    style={{
                      background: isSpeaking
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(11, 109, 255, 0.05) 0%, rgba(8, 77, 182, 0.1) 100%)',
                      borderColor: isSpeaking ? 'var(--color-success)' : 'var(--neutral-700)',
                      boxShadow: isSpeaking ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none'
                    }}
                  >
                    <div className="text-center py-8">
                      <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-2xl">
                        <span className="text-5xl font-bold text-white">
                          {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <p className="text-lg font-semibold mb-1" style={{ color: 'var(--neutral-800)' }}>{user?.nombre || 'Usuario'}</p>
                      {isSpeaking && (
                        <div className="mt-3 flex justify-center gap-1">
                          <span className="w-2 h-8 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)' }}></span>
                          <span className="w-2 h-12 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)', animationDelay: '150ms' }}></span>
                          <span className="w-2 h-10 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)', animationDelay: '300ms' }}></span>
                          <span className="w-2 h-8 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)', animationDelay: '450ms' }}></span>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}>
                      {user?.nombre || 'Tú'}
                    </div>
                  </div>
                </div>

                {/* Controles */}
                <div className="flex justify-center items-center gap-3 py-2">
                  <button
                    onClick={toggleMute}
                    disabled={!isAvatarConnected}
                    className="text-white p-4 rounded-full transition-all duration-200 shadow-lg"
                    style={{
                      backgroundColor: !isAvatarConnected
                        ? 'var(--neutral-400)'
                        : isMuted
                        ? 'var(--color-error)'
                        : 'var(--color-primary)',
                      cursor: !isAvatarConnected ? 'not-allowed' : 'pointer',
                      opacity: !isAvatarConnected ? '0.5' : '1',
                      transform: !isAvatarConnected ? 'none' : 'scale(1)',
                    }}
                    onMouseEnter={(e) => {
                      if (isAvatarConnected) {
                        e.currentTarget.style.backgroundColor = isMuted ? 'var(--color-error-dark)' : 'var(--color-primary-dark)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isAvatarConnected) {
                        e.currentTarget.style.backgroundColor = isMuted ? 'var(--color-error)' : 'var(--color-primary)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                    title={!isAvatarConnected ? "Esperando..." : isMuted ? "Activar micrófono (Space)" : "Silenciar micrófono (Space)"}
                  >
                    {isMuted || !isAvatarConnected ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={handleAbandonarLlamada}
                    className="text-white px-4 py-3 rounded-lg transition-all duration-200 text-sm font-semibold shadow-lg flex items-center gap-2"
                    style={{ backgroundColor: 'var(--neutral-600)', border: '2px solid var(--neutral-500)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--neutral-700)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--neutral-600)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Cancelar sesión y eliminar caso"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Abandonar Llamada
                  </button>

                  <button
                    onClick={handleFinalizarSesion}
                    className="text-white px-6 py-3 rounded-lg transition-all duration-200 text-sm font-semibold shadow-lg flex items-center gap-2"
                    style={{ backgroundColor: 'var(--color-error)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-error-dark)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-error)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Finalizar Sesión
                  </button>

                  <div className="text-xs ml-4" style={{ color: 'var(--neutral-600)' }}>
                    Atajo: <kbd className="px-2 py-1 rounded font-mono" style={{ backgroundColor: 'var(--neutral-200)', color: 'var(--neutral-700)', border: '1px solid var(--neutral-300)' }}>Space</kbd> Mutear
                  </div>
                </div>
              </div>

              {/* Panel de Transcripciones (35%) */}
              <div className="w-[35%] flex-shrink-0" style={{ height: 'calc(100vh - 160px)' }}>
                <div className="h-full rounded-lg overflow-hidden shadow-xl" style={{ border: '1px solid var(--neutral-300)', backgroundColor: 'white' }}>
                  <TranscriptPanel />
                </div>
              </div>
            </div>

            <RoomAudioRenderer />
          </LiveKitRoom>
        )}

        {/* ESTADO C: PROCESANDO */}
        {sessionState.isProcesando && (
          <div className="h-full flex items-center justify-center">
            <div className="rounded-lg p-8 max-w-md w-full mx-4 text-center" style={{ backgroundColor: 'white', border: '1px solid var(--neutral-300)' }}>
              <div className="mb-6">
                <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-primary mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--neutral-800)' }}>Procesando Conversación</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--neutral-600)' }}>
                  Estamos analizando tu conversación con IA para auto-llenar los campos...
                </p>
                <div className="space-y-2 text-left text-sm" style={{ color: 'var(--neutral-700)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" style={{ color: 'var(--color-success)' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Sesión finalizada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    </div>
                    <span>Extrayendo información con IA...</span>
                  </div>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--neutral-500)' }}>
                Esto puede tomar unos segundos. No cierres esta ventana.
              </p>
            </div>
          </div>
        )}

        {/* ESTADO D: REVISIÓN */}
        {sessionState.isRevision && sessionState.casoData && (
          <div className="h-full p-4">
            <RevisionRapida
              caso={sessionState.casoData}
              conversacion={conversacion}
              onCasoUpdated={handleCasoUpdated}
              onDocumentoGenerado={handleDocumentoGenerado}
            />
          </div>
        )}
      </div>

      {/* Modal de confirmación eliminado - ahora inicia automáticamente */}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, useTracks, useLocalParticipant, useRemoteParticipants } from '@livekit/components-react';
import { Track } from 'livekit-client';
import livekitService from '../services/livekitService';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import TranscriptPanel from '../components/TranscriptPanel';

// Componente para detectar participantes remotos (avatar)
function AvatarDetector({ onAvatarConnected }) {
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    // Cuando hay al menos 1 participante remoto, el avatar está conectado
    const isConnected = remoteParticipants.length > 0;
    onAvatarConnected?.(isConnected);
  }, [remoteParticipants, onAvatarConnected]);

  return null;
}

// Componente para controles de audio (debe estar dentro de LiveKitRoom)
function AudioControls({ isMuted, onToggleMute, onMicActivity, isEnabled }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant) {
      // Solo habilitar micrófono si isEnabled es true
      localParticipant.setMicrophoneEnabled(isEnabled && !isMuted);
    }
  }, [isMuted, localParticipant, isEnabled]);

  // Detectar actividad del micrófono
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

function VideoComponent({ onSpeakingChange, isSpeaking: isAvatarSpeaking }) {
  const tracks = useTracks([Track.Source.Camera]);
  const videoRef = useRef(null);

  // Detectar cuando el avatar está hablando
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
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default function AvatarSession() {
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [casoId, setCasoId] = useState(null); // 🆕 Guardar el caso_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(true); // Iniciar muteado
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAvatarConnected, setIsAvatarConnected] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoContainerRef = useRef(null);
  const isInitializingRef = useRef(false); // 🔒 Bandera para evitar llamadas duplicadas

  // Contador de tiempo de sesión (solo cuando el avatar está conectado)
  useEffect(() => {
    if (!isAvatarConnected) return;

    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAvatarConnected]);

  // Desmutear automáticamente cuando el avatar se conecta
  useEffect(() => {
    if (isAvatarConnected && isMuted) {
      setIsMuted(false);
    }
  }, [isAvatarConnected]);

  // Formatear tiempo de sesión (HH:MM:SS)
  const formatSessionTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const initializeSession = async () => {
      // 🔒 Evitar llamadas duplicadas causadas por React StrictMode
      if (isInitializingRef.current) {
        console.log('⚠️ Inicialización ya en proceso, saltando llamada duplicada...');
        return;
      }

      isInitializingRef.current = true;

      try {
        setLoading(true);
        console.log('🚀 Iniciando sesión con el avatar...');
        const data = await livekitService.getToken();
        setToken(data.token);
        setServerUrl(data.url);
        setCasoId(data.caso_id); // 🆕 Guardar el caso_id del response
        console.log('✅ Sesión iniciada - Caso ID:', data.caso_id);
        setLoading(false);
      } catch (err) {
        console.error('Error inicializando sesión:', err);
        setError('Error al conectar con el servidor. Por favor intenta de nuevo.');
        setLoading(false);
        isInitializingRef.current = false; // Reset en caso de error para permitir retry
      }
    };

    initializeSession();
  }, []);

  const handleDisconnect = async () => {
    // 🆕 Finalizar la sesión en el backend antes de navegar
    if (casoId) {
      try {
        console.log('🔚 Finalizando sesión - Caso ID:', casoId);
        await api.put(`/sesiones/${casoId}/finalizar`);
        console.log('✅ Sesión finalizada correctamente');
      } catch (error) {
        console.error('❌ Error finalizando sesión:', error);
        // Continuar navegando incluso si hay error
      }
    }
    navigate('/app/dashboard');
  };

  const toggleMute = () => {
    // Solo permitir toggle si el avatar está conectado
    if (!isAvatarConnected) return;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
        } else if (videoContainerRef.current.webkitRequestFullscreen) {
          await videoContainerRef.current.webkitRequestFullscreen();
        } else if (videoContainerRef.current.msRequestFullscreen) {
          await videoContainerRef.current.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Escuchar cambios de fullscreen del navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ': // Space - mutear/desmutear
          e.preventDefault();
          // Solo permitir si el avatar está conectado
          if (isAvatarConnected) {
            toggleMute();
          }
          break;
        case 'f': // F - fullscreen
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'escape': // Esc - salir de fullscreen
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMuted, isFullscreen, isAvatarConnected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Conectando con tu asistente legal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900 text-white p-8 rounded-lg max-w-md">
          <h2 className="text-2xl font-bold mb-4">Error de Conexión</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Sesión con Asistente Legal</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Hola {user?.nombre}, estoy aquí para ayudarte
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Contador de tiempo */}
            <div className="flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white font-mono text-sm">{formatSessionTime(sessionTime)}</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleDisconnect}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Componente para detectar cuando el avatar se conecta */}
          <AvatarDetector onAvatarConnected={setIsAvatarConnected} />

          {/* Componente de controles de audio */}
          <AudioControls
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onMicActivity={setIsSpeaking}
            isEnabled={isAvatarConnected}
          />

          <div className="flex-1 flex gap-3 overflow-hidden p-4" ref={videoContainerRef}>
            {/* Panel de Videos (60%) - Izquierda */}
            <div className="w-[60%] flex flex-col gap-3">
              {/* Grid de Avatar y Usuario (lado a lado) */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                {/* Avatar (Izquierda) */}
                <div
                  className={`relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-300 ${
                    isAvatarSpeaking ? 'ring-4 ring-blue-500 shadow-lg shadow-blue-500/50' : 'ring-2 ring-gray-700'
                  }`}
                >
                  <VideoComponent
                    onSpeakingChange={setIsAvatarSpeaking}
                    isSpeaking={isAvatarSpeaking}
                  />
                  <div className="absolute bottom-3 left-3 bg-gray-900 bg-opacity-80 px-3 py-1 rounded text-white text-xs">
                    Asistente Legal
                  </div>
                  {/* Botón de fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="absolute top-3 right-3 bg-gray-900 bg-opacity-80 hover:bg-opacity-100 text-white p-2 rounded-lg transition"
                    title={isFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa (F)"}
                  >
                    {isFullscreen ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Usuario (Derecha) */}
                <div
                  className={`relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-300 flex items-center justify-center ${
                    isSpeaking ? 'ring-4 ring-green-500 shadow-lg shadow-green-500/50' : 'ring-2 ring-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-xl">
                      <span className="text-4xl font-bold text-white">
                        {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-base">{user?.nombre || 'Usuario'}</p>
                    {isSpeaking && (
                      <div className="mt-2 flex justify-center gap-1">
                        <span className="w-1.5 h-6 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-8 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-6 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-gray-900 bg-opacity-80 px-3 py-1 rounded text-white text-xs">
                    {user?.nombre || 'Tú'}
                  </div>
                </div>
              </div>

              {/* Barra de controles */}
              <div className="flex justify-center items-center gap-3 py-2">
                <button
                  onClick={toggleMute}
                  disabled={!isAvatarConnected}
                  className={`${
                    !isAvatarConnected
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : isMuted
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white p-3 rounded-full transition shadow-lg`}
                  title={
                    !isAvatarConnected
                      ? "Esperando al asistente..."
                      : isMuted
                      ? "Activar micrófono (Space)"
                      : "Silenciar micrófono (Space)"
                  }
                >
                  {isMuted || !isAvatarConnected ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>

                {!isAvatarConnected ? (
                  <div className="text-gray-400 text-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                    Esperando al asistente...
                  </div>
                ) : isSpeaking && (
                  <div className="text-gray-400 text-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Hablando...
                  </div>
                )}

                <div className="text-gray-500 text-xs ml-4">
                  Atajos: <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Space</kbd> Mutear • <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">F</kbd> Fullscreen
                </div>
              </div>
            </div>

            {/* Panel de Transcripciones (40%) - Derecha */}
            <div className="w-[40%] flex-shrink-0" style={{ height: 'calc(100vh - 140px)' }}>
              <div className="h-full rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                <TranscriptPanel />
              </div>
            </div>
          </div>

          {/* Audio Renderer - necesario para escuchar el audio */}
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}

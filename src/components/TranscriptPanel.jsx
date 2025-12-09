import { useEffect, useRef } from 'react';
import { useTranscriptions } from '../hooks/useTranscriptions';

/**
 * Componente individual de mensaje de transcripción
 */
function TranscriptMessage({ text, role, timestamp, isFinal }) {
  const isUser = role === 'usuario';

  // Formatear timestamp
  const time = new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`
          max-w-[80%] rounded-lg px-4 py-2
          ${isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-white'
          }
          ${!isFinal ? 'opacity-70 italic' : 'opacity-100'}
          transition-opacity duration-200
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold">
            {isUser ? '👤 Usuario' : '⚖️ Sofía'}
          </span>
          <span className="text-xs opacity-70">{time}</span>
        </div>
        <p className="text-sm leading-relaxed break-words">{text}</p>
        {!isFinal && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Panel de transcripciones en tiempo real
 * Muestra las transcripciones de la conversación entre el usuario y el asistente
 */
export function TranscriptPanel() {
  const transcriptions = useTranscriptions();
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll cuando llegan nuevas transcripciones
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptions]);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header del panel */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          Transcripción en Vivo
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Todas las conversaciones se guardan automáticamente
        </p>
      </div>

      {/* Área de mensajes */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar"
      >
        {transcriptions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <p className="text-sm">Esperando conversación...</p>
              <p className="text-xs mt-2 opacity-70">
                Las transcripciones aparecerán aquí en tiempo real
              </p>
            </div>
          </div>
        ) : (
          <>
            {transcriptions.map((transcript) => (
              <TranscriptMessage
                key={transcript.id}
                text={transcript.text}
                role={transcript.role}
                timestamp={transcript.timestamp}
                isFinal={transcript.isFinal}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Footer informativo */}
      <div className="bg-gray-900 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Grabando</span>
          </div>
          <span>{transcriptions.length} mensajes</span>
        </div>
      </div>
    </div>
  );
}

export default TranscriptPanel;

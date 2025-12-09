import { useEffect, useState } from 'react';
import { useRoomContext, useConnectionState } from '@livekit/components-react';
import { ConnectionState, RoomEvent } from 'livekit-client';

/**
 * Hook personalizado para capturar transcripciones de LiveKit
 * Diferencia entre mensajes del usuario y del asistente
 *
 * @returns {Array} Array de objetos de transcripción con formato:
 *   { id, text, role: 'usuario'|'asistente', timestamp, isFinal }
 */
export function useTranscriptions() {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const [transcriptions, setTranscriptions] = useState([]);

  // Limpiar transcripciones cuando se desconecta
  useEffect(() => {
    if (connectionState === ConnectionState.Disconnected) {
      setTranscriptions([]);
    }
  }, [connectionState]);

  // Escuchar eventos de transcripción
  useEffect(() => {
    if (!room) {
      return;
    }

    const handleTranscriptionReceived = (segments, participant) => {
      console.log('📝 Transcripción recibida:', {
        segments,
        participantIdentity: participant?.identity,
        participantName: participant?.name
      });

      setTranscriptions((prev) => {
        const updated = [...prev];

        for (const segment of segments) {
          // Determinar si es el usuario o el asistente
          // El agente tiene identity "agent" por defecto
          // El usuario tiene su propio identity
          const isAgent = participant?.identity?.toLowerCase().includes('agent') ||
                         participant?.name?.toLowerCase().includes('agent') ||
                         participant?.identity?.toLowerCase().includes('assistant');

          const role = isAgent ? 'asistente' : 'usuario';

          // Buscar si ya existe este segmento (para actualizaciones)
          const existingIndex = updated.findIndex((t) => t.id === segment.id);

          const transcriptionObj = {
            id: segment.id,
            text: segment.text,
            role: role,
            timestamp: segment.firstReceivedTime || Date.now(),
            isFinal: segment.final || false,
            participantIdentity: participant?.identity,
            participantName: participant?.name
          };

          if (existingIndex !== -1) {
            // Actualizar el segmento existente
            updated[existingIndex] = transcriptionObj;
          } else {
            // Agregar nuevo segmento
            updated.push(transcriptionObj);
          }
        }

        // Ordenar por timestamp
        return updated.sort((a, b) => a.timestamp - b.timestamp);
      });
    };

    // Suscribirse al evento de transcripción
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
    };
  }, [room]);

  return transcriptions;
}

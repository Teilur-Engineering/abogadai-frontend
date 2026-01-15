import { useEffect, useRef } from 'react';

/**
 * Modal de confirmación para salir de una sesión activa.
 * Advierte al usuario que perderá el progreso si sale.
 */
export default function ModalConfirmarSalida({
  isOpen,
  onConfirmar,
  onCancelar,
  titulo = "¿Estás seguro que deseas salir?",
  mensaje = "Si sales ahora, perderás todo el progreso de tu sesión actual. El caso no quedará guardado y tendrás que iniciar una nueva sesión.",
  textoConfirmar = "Salir y eliminar",
  textoCancelar = "Continuar sesión",
  isLoading = false
}) {
  const modalRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Focus en el botón de cancelar al abrir (opción segura)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancelar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onCancelar]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isLoading ? onCancelar : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-fadeIn"
        style={{
          animation: 'fadeIn 0.2s ease-out, slideUp 0.2s ease-out',
        }}
      >
        {/* Icono de advertencia */}
        <div className="pt-6 pb-2 flex justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--color-error)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 pb-2 text-center">
          <h3
            id="modal-title"
            className="text-xl font-bold mb-3"
            style={{ color: 'var(--neutral-800)' }}
          >
            {titulo}
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--neutral-600)' }}
          >
            {mensaje}
          </p>
        </div>

        {/* Advertencia adicional */}
        <div className="mx-6 my-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-warning-light, #fef3c7)' }}>
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--color-warning, #f59e0b)' }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs" style={{ color: 'var(--color-warning-dark, #92400e)' }}>
              <strong>Esta acción no se puede deshacer.</strong> Tendrás que iniciar una nueva sesión desde el principio.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancelar}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200"
            style={{
              backgroundColor: 'var(--neutral-100)',
              color: 'var(--neutral-700)',
              border: '1px solid var(--neutral-300)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--neutral-200)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--neutral-100)';
            }}
          >
            {textoCancelar}
          </button>

          <button
            onClick={onConfirmar}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: isLoading ? 'var(--neutral-400)' : 'var(--color-error)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--color-error-dark)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--color-error)';
              }
            }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {textoConfirmar}
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

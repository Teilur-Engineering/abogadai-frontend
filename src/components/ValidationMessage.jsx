/**
 * Componente para mostrar mensajes de validación (errores y advertencias)
 */

export default function ValidationMessage({ message }) {
  if (!message) return null;

  const isError = message.level === 'error';
  const isWarning = message.level === 'warning';

  const baseClasses = "mt-1 text-sm flex items-start gap-2 p-2 rounded";
  const errorClasses = "bg-red-50 text-red-700 border border-red-200";
  const warningClasses = "bg-yellow-50 text-yellow-700 border border-yellow-200";

  return (
    <div className={`${baseClasses} ${isError ? errorClasses : warningClasses}`}>
      <span className="flex-shrink-0 text-lg">
        {isError ? '🔴' : '🟡'}
      </span>
      <span className="flex-1">{message.message}</span>
    </div>
  );
}

/**
 * Componente para mostrar múltiples mensajes de validación de un campo
 */
export function FieldValidationMessages({ fieldName, validationResult }) {
  if (!validationResult) return null;

  const { errores = [], advertencias = [] } = validationResult;

  // Filtrar mensajes que corresponden a este campo
  const fieldErrors = errores.filter(e => e.field === fieldName);
  const fieldWarnings = advertencias.filter(w => w.field === fieldName);

  if (fieldErrors.length === 0 && fieldWarnings.length === 0) return null;

  return (
    <div className="space-y-1">
      {fieldErrors.map((error, index) => (
        <ValidationMessage key={`error-${index}`} message={error} />
      ))}
      {fieldWarnings.map((warning, index) => (
        <ValidationMessage key={`warning-${index}`} message={warning} />
      ))}
    </div>
  );
}

/**
 * Badge de contador de validaciones para el botón de generar
 */
export function ValidationBadge({ validationResult }) {
  if (!validationResult) return null;

  const { errores = [], advertencias = [] } = validationResult;
  const errorCount = errores.length;
  const warningCount = advertencias.length;

  if (errorCount === 0 && warningCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {errorCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          🔴 {errorCount} {errorCount === 1 ? 'error' : 'errores'}
        </span>
      )}
      {warningCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          🟡 {warningCount} {warningCount === 1 ? 'advertencia' : 'advertencias'}
        </span>
      )}
    </div>
  );
}

/**
 * Panel de resumen de validaciones
 */
export function ValidationSummary({ validationResult, onFixErrors }) {
  if (!validationResult) return null;

  const { valido, errores = [], advertencias = [] } = validationResult;

  if (valido && advertencias.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="font-medium text-green-900">Todo listo para generar</h3>
            <p className="text-sm text-green-700 mt-1">
              Todos los campos requeridos están completos y con formato válido
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 mb-6 ${errores.length > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{errores.length > 0 ? '🔴' : '🟡'}</span>
            <h3 className={`font-medium ${errores.length > 0 ? 'text-red-900' : 'text-yellow-900'}`}>
              {errores.length > 0 ? 'Correcciones necesarias' : 'Recomendaciones'}
            </h3>
          </div>

          {errores.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-red-700 mb-2">
                Para generar el documento legal, debes corregir estos campos:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {errores.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}

          {advertencias.length > 0 && (
            <div>
              <p className="text-sm text-yellow-700 mb-2">
                {errores.length > 0 ? 'También hay algunas advertencias:' : 'Recomendaciones para mejorar el documento:'}
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                {advertencias.map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {errores.length > 0 && onFixErrors && (
          <button
            onClick={onFixErrors}
            className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition"
          >
            Ir a corregir
          </button>
        )}
      </div>
    </div>
  );
}

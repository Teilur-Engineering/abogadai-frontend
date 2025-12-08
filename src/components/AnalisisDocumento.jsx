import { useState } from 'react';

export default function AnalisisDocumento({ caso, onAnalizarFortaleza }) {
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  // Validación de seguridad: si no hay caso, no renderizar nada
  if (!caso) {
    return null;
  }

  const fortaleza = caso?.analisis_fortaleza;
  const calidad = caso?.analisis_calidad?.calidad;
  const jurisprudencia = caso?.analisis_jurisprudencia;
  const sugerencias = caso?.sugerencias_mejora;

  // Componente para mostrar puntuación con barra de progreso
  const PuntuacionBarra = ({ puntos, max, label, color }) => {
    const porcentaje = (puntos / max) * 100;
    const colorClass = porcentaje >= 70 ? 'bg-green-500' :
                      porcentaje >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span className="font-semibold">{puntos}/{max}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${colorClass} h-2 rounded-full transition-all`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Botón para analizar fortaleza (antes de generar documento) */}
      {!fortaleza && !caso.documento_generado && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Analiza tu caso antes de generar
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Evalúa la fortaleza de tu caso y recibe recomendaciones antes de crear el documento oficial.
              </p>
              <button
                onClick={onAnalizarFortaleza}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                🔍 Analizar Fortaleza del Caso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Análisis de Fortaleza */}
      {fortaleza && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📊 Análisis de Fortaleza del Caso
            </h3>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              fortaleza.fortaleza_total >= 70 ? 'bg-green-100 text-green-800' :
              fortaleza.fortaleza_total >= 50 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {fortaleza.fortaleza_total}/100
            </span>
          </div>

          {/* Probabilidad de Éxito */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Probabilidad de Éxito:</span>
              <span className="text-lg font-bold text-gray-900">
                {fortaleza.probabilidad_porcentaje || fortaleza.probabilidad_exito}
              </span>
            </div>
          </div>

          {/* Advertencia si no debe proceder */}
          {fortaleza.debe_proceder === false && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">⚠️ Advertencia Importante</p>
                  <p className="text-sm text-red-700">{fortaleza.razon_no_proceder}</p>
                </div>
              </div>
            </div>
          )}

          {/* Detalles del Análisis */}
          <button
            onClick={() => setMostrarDetalles(!mostrarDetalles)}
            className="w-full text-left flex items-center justify-between py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <span>{mostrarDetalles ? '▼' : '▶'} Ver análisis detallado</span>
          </button>

          {mostrarDetalles && (
            <div className="mt-4 space-y-4">
              {/* Criterios Evaluados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fortaleza.procedencia_tutela && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Procedencia de Tutela</h4>
                    <PuntuacionBarra puntos={fortaleza.procedencia_tutela.puntos} max={20} label="" />
                    <p className="text-xs text-gray-600 mt-1">{fortaleza.procedencia_tutela.comentario}</p>
                  </div>
                )}

                {fortaleza.derechos_fundamentales && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Derechos Fundamentales</h4>
                    <PuntuacionBarra puntos={fortaleza.derechos_fundamentales.puntos} max={20} label="" />
                    <p className="text-xs text-gray-600 mt-1">{fortaleza.derechos_fundamentales.comentario}</p>
                  </div>
                )}

                {fortaleza.subsidiaridad && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Subsidiaridad</h4>
                    <PuntuacionBarra puntos={fortaleza.subsidiaridad.puntos} max={20} label="" />
                    <p className="text-xs text-gray-600 mt-1">{fortaleza.subsidiaridad.comentario}</p>
                  </div>
                )}

                {fortaleza.claridad_hechos && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Claridad de Hechos</h4>
                    <PuntuacionBarra puntos={fortaleza.claridad_hechos.puntos} max={15} label="" />
                    <p className="text-xs text-gray-600 mt-1">{fortaleza.claridad_hechos.comentario}</p>
                  </div>
                )}
              </div>

              {/* Puntos Fuertes */}
              {fortaleza.puntos_fuertes && fortaleza.puntos_fuertes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-800 mb-2">✓ Puntos Fuertes:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {fortaleza.puntos_fuertes.map((punto, idx) => (
                      <li key={idx} className="text-sm text-gray-700">{punto}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Puntos Débiles */}
              {fortaleza.puntos_debiles && fortaleza.puntos_debiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-800 mb-2">⚠ Puntos Débiles:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {fortaleza.puntos_debiles.map((punto, idx) => (
                      <li key={idx} className="text-sm text-gray-700">{punto}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones */}
              {fortaleza.recomendaciones && fortaleza.recomendaciones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Recomendaciones:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {fortaleza.recomendaciones.map((rec, idx) => (
                      <li key={idx} className="text-sm text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Panel de Análisis de Calidad del Documento */}
      {calidad && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📝 Análisis de Calidad del Documento
            </h3>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              calidad.puntuacion_total >= 80 ? 'bg-green-100 text-green-800' :
              calidad.puntuacion_total >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {calidad.puntuacion_total}/100
            </span>
          </div>

          {/* Listo para Radicar */}
          <div className={`mb-4 p-3 rounded-lg ${
            calidad.listo_para_radicar
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className="text-sm font-medium">
              {calidad.listo_para_radicar
                ? '✅ El documento está listo para radicar'
                : '⚠️ El documento requiere revisión antes de radicar'}
            </p>
          </div>

          {/* Problemas Encontrados */}
          {calidad.problemas_encontrados && calidad.problemas_encontrados.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Problemas Detectados:</h4>
              <ul className="list-disc list-inside space-y-1">
                {calidad.problemas_encontrados.map((problema, idx) => (
                  <li key={idx} className="text-sm text-gray-700">{problema}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sugerencias de Mejora */}
          {calidad.sugerencias_mejora && calidad.sugerencias_mejora.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Sugerencias de Mejora:</h4>
              <ul className="list-disc list-inside space-y-1">
                {calidad.sugerencias_mejora.map((sug, idx) => (
                  <li key={idx} className="text-sm text-gray-700">{sug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Panel de Jurisprudencia */}
      {jurisprudencia && jurisprudencia.total_sentencias > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚖️ Jurisprudencia Citada
          </h3>

          <p className="text-sm text-gray-700 mb-3">
            Se encontraron <strong>{jurisprudencia.total_sentencias}</strong> sentencias citadas en el documento.
          </p>

          {jurisprudencia.advertencia && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">⚠️ {jurisprudencia.advertencia}</p>
            </div>
          )}

          {/* Lista de Sentencias */}
          {jurisprudencia.sentencias_citadas && jurisprudencia.sentencias_citadas.length > 0 && (
            <div className="space-y-2">
              {jurisprudencia.sentencias_citadas.map((sent, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm font-mono font-semibold">{sent.referencia}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel de Sugerencias */}
      {sugerencias && sugerencias.total_sugerencias > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💡 Sugerencias de Mejora ({sugerencias.total_sugerencias})
          </h3>

          {sugerencias.prioridad_critica > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900">
                {sugerencias.prioridad_critica} sugerencias críticas
              </p>
            </div>
          )}

          <div className="space-y-3">
            {sugerencias.sugerencias.map((sug, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  sug.prioridad === 'crítica'
                    ? 'bg-red-50 border-red-200'
                    : sug.prioridad === 'alta'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {sug.prioridad}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{sug.categoria}</p>
                    <p className="text-sm text-gray-700 mt-1">{sug.descripcion}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Acción:</strong> {sug.accion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

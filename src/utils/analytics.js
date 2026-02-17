/**
 * Utilidad para enviar eventos al dataLayer de GTM
 *
 * Uso: trackEvent('event_name', { key: value })
 *
 * Los eventos se configuran como triggers en GTM para enviarlos a GA4.
 */
export function trackEvent(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

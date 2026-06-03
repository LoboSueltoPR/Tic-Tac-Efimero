// Wrapper de Google Calendar — DIFERIDO (ver paso 4 del spec).
//
// La sincronización real con Google Calendar requiere un backend (service
// account + private key), que NO puede vivir en el cliente. El plan es una
// Firebase Cloud Function que reciba { action, eventData } y use el service
// account para crear/editar/eliminar en Google Calendar, devolviendo el
// google_event_id para guardarlo en Firestore.
//
// Por ahora esto es un no-op para no romper el flujo: la app funciona 100%
// con Firestore. Cuando se implemente el backend, completar
// VITE_GCAL_SYNC_URL y reemplazar el cuerpo de esta función por un fetch.

type GCalAction = 'create' | 'update' | 'delete';

const SYNC_URL = import.meta.env.VITE_GCAL_SYNC_URL as string | undefined;

export const isGoogleCalendarEnabled = Boolean(SYNC_URL);

export async function syncToGoogleCalendar(
  action: GCalAction,
  eventData: Record<string, unknown>
): Promise<{ google_event_id?: string } | null> {
  if (!SYNC_URL) {
    // Integración diferida: no hacemos nada todavía.
    return null;
  }

  // Implementación futura (cuando exista la Cloud Function):
  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, eventData }),
  });
  if (!res.ok) {
    throw new Error(`Google Calendar sync devolvió ${res.status}`);
  }
  return res.json();
}

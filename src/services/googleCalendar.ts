// Integración con Google Calendar 100% en el navegador, vía Google Identity
// Services (OAuth2 token client). SIN backend, SIN service account, SIN Blaze.
//
// El usuario se conecta con su cuenta Google y autoriza el scope de eventos.
// Con el access token llamamos a la Calendar API REST directamente desde el
// cliente. El `id` que devuelve Google se guarda en Firestore como
// `google_event_id` para poder editar/eliminar después.
//
// Requiere:
//   - VITE_GOOGLE_CLIENT_ID  (OAuth Client ID web, gratis en Google Cloud)
//   - VITE_GOOGLE_CALENDAR_ID (opcional; por defecto 'primary')
//   - El script de GIS cargado en index.html.

import type { AgendaEvent, EventInput } from '../types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const CALENDAR_ID =
  (import.meta.env.VITE_GOOGLE_CALENDAR_ID as string) || 'primary';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3';
const STORAGE_HINT = 'gcal_connected';

export const isGoogleCalendarConfigured = Boolean(CLIENT_ID);

const TZ =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';

// ---- Estado del token (en memoria) ----
let tokenClient: GoogleTokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

type Listener = (connected: boolean) => void;
const listeners = new Set<Listener>();

export function isConnected(): boolean {
  return Boolean(accessToken && Date.now() < tokenExpiry);
}

function emit() {
  const c = isConnected();
  listeners.forEach((l) => l(c));
}

/** Suscribe a cambios de conexión. Devuelve función para desuscribirse. */
export function onConnectionChange(l: Listener): () => void {
  listeners.add(l);
  l(isConnected());
  return () => listeners.delete(l);
}

// ---- GIS helpers (tipado laxo para no depender de @types) ----
interface GoogleTokenClient {
  callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
  requestAccessToken: (opts?: { prompt?: string }) => void;
}

function gisOAuth(): {
  initTokenClient: (opts: Record<string, unknown>) => GoogleTokenClient;
  revoke: (token: string, cb?: () => void) => void;
} | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google;
  return g?.accounts?.oauth2 ?? null;
}

/** Espera (poll) a que el script de GIS termine de cargar. */
async function waitForGis(timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  while (!gisOAuth()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Google Identity Services no cargó (revisá tu conexión).');
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function ensureTokenClient(): Promise<GoogleTokenClient> {
  await waitForGis();
  if (!tokenClient) {
    tokenClient = gisOAuth()!.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {},
    });
  }
  return tokenClient;
}

function applyToken(resp: { access_token?: string; expires_in?: number }) {
  accessToken = resp.access_token ?? null;
  const ttl = (resp.expires_in ?? 3600) * 1000;
  tokenExpiry = Date.now() + ttl - 60_000; // margen de 1 min
  if (accessToken) localStorage.setItem(STORAGE_HINT, '1');
  emit();
}

/** Conecta (muestra el popup de Google la primera vez). */
export async function connect(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('Falta VITE_GOOGLE_CLIENT_ID en .env.');
  }
  const client = await ensureTokenClient();
  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) return reject(new Error(resp.error));
      applyToken(resp);
      resolve();
    };
    client.requestAccessToken({ prompt: 'consent' });
  });
}

/** Intenta reconectar en silencio si el usuario ya autorizó antes. */
export async function tryAutoConnect(): Promise<void> {
  if (!CLIENT_ID || isConnected()) return;
  if (localStorage.getItem(STORAGE_HINT) !== '1') return;
  try {
    const client = await ensureTokenClient();
    await new Promise<void>((resolve) => {
      client.callback = (resp) => {
        if (!resp.error) applyToken(resp);
        resolve();
      };
      client.requestAccessToken({ prompt: '' });
    });
  } catch {
    /* silencioso */
  }
}

export function disconnect(): void {
  const oauth = gisOAuth();
  if (accessToken && oauth) oauth.revoke(accessToken);
  accessToken = null;
  tokenExpiry = 0;
  localStorage.removeItem(STORAGE_HINT);
  emit();
}

// ---- Llamadas a la Calendar API ----
function headers() {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

function toGoogleEvent(e: EventInput | AgendaEvent) {
  return {
    summary: e.title,
    description: e.description || '',
    start: { dateTime: `${e.date}T${e.start_time}:00`, timeZone: TZ },
    end: { dateTime: `${e.date}T${e.end_time}:00`, timeZone: TZ },
  };
}

const eventsUrl = `${API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

/** Crea el evento en Google Calendar. Devuelve el id de Google o null. */
export async function gcalCreate(e: EventInput): Promise<string | null> {
  if (!isConnected()) return null;
  const res = await fetch(eventsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(toGoogleEvent(e)),
  });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  const data = await res.json();
  return data.id ?? null;
}

export async function gcalUpdate(
  googleId: string,
  e: AgendaEvent
): Promise<void> {
  if (!isConnected()) return;
  const res = await fetch(`${eventsUrl}/${encodeURIComponent(googleId)}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(toGoogleEvent(e)),
  });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
}

export async function gcalDelete(googleId: string): Promise<void> {
  if (!isConnected()) return;
  const res = await fetch(`${eventsUrl}/${encodeURIComponent(googleId)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  // 410 = ya borrado en Google; lo tratamos como ok.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Calendar API ${res.status}`);
  }
}

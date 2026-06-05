// Inicialización de Firebase y helpers de Firestore para la colección `events`.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { AgendaEvent, EventInput } from '../types';
import {
  gcalCreate,
  gcalUpdate,
  gcalDelete,
  isConnected as gcalConnected,
} from './googleCalendar';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn(
    '[firebase] Falta configuración. Completá las variables VITE_FIREBASE_* en .env para activar la persistencia.'
  );
}

const COLLECTION = 'events';

function eventsCollection() {
  if (!db) throw new Error('Firebase no está configurado (revisá .env).');
  return collection(db, COLLECTION);
}

/** Suscripción en tiempo real a todos los eventos, ordenados por fecha/hora. */
export function subscribeEvents(
  onChange: (events: AgendaEvent[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    onChange([]);
    return () => {};
  }
  // Ordenamos solo por `date` en Firestore (índice automático) y desempatamos
  // por `start_time` en JS, para no requerir un índice compuesto.
  const q = query(eventsCollection(), orderBy('date'));
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as AgendaEvent)
        .sort(byDateTime);
      onChange(events);
    },
    (err) => {
      console.error('[firebase] onSnapshot error', err);
      onError?.(err);
    }
  );
}

/** Consulta puntual de eventos en un rango de fechas (YYYY-MM-DD inclusive). */
export async function queryEventsInRange(
  fromDate: string,
  toDate: string
): Promise<AgendaEvent[]> {
  const q = query(
    eventsCollection(),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
    orderBy('date')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as AgendaEvent)
    .sort(byDateTime);
}

/** Orden cronológico por fecha y luego por hora de inicio (ambos strings). */
function byDateTime(a: AgendaEvent, b: AgendaEvent): number {
  return `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`);
}

export async function createEvent(input: EventInput): Promise<string> {
  const ref = await addDoc(eventsCollection(), {
    ...input,
    description: input.description ?? '',
    google_event_id: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  // Sync a Google Calendar (no bloquea ni rompe si falla / no conectado).
  if (gcalConnected()) {
    try {
      const gid = await gcalCreate(input);
      if (gid) await updateDoc(doc(db!, COLLECTION, ref.id), { google_event_id: gid });
    } catch (e) {
      console.warn('[googleCalendar] create falló', e);
    }
  }
  return ref.id;
}

export async function updateEvent(
  id: string,
  patch: Partial<EventInput>
): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado (revisá .env).');
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...patch, updated_at: serverTimestamp() });

  if (gcalConnected()) {
    try {
      const snap = await getDoc(ref);
      const ev = { id, ...snap.data() } as AgendaEvent;
      if (ev.google_event_id) {
        await gcalUpdate(ev.google_event_id, ev);
      } else {
        // No existía en Google todavía: lo creamos ahora.
        const gid = await gcalCreate(ev);
        if (gid) await updateDoc(ref, { google_event_id: gid });
      }
    } catch (e) {
      console.warn('[googleCalendar] update falló', e);
    }
  }
}

export async function deleteEvent(id: string): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado (revisá .env).');
  const ref = doc(db, COLLECTION, id);

  // Leemos el google_event_id antes de borrar el doc.
  let googleId: string | null = null;
  if (gcalConnected()) {
    try {
      const snap = await getDoc(ref);
      googleId = (snap.data()?.google_event_id as string | undefined) ?? null;
    } catch {
      /* ignorar */
    }
  }

  await deleteDoc(ref);

  if (googleId && gcalConnected()) {
    try {
      await gcalDelete(googleId);
    } catch (e) {
      console.warn('[googleCalendar] delete falló', e);
    }
  }
}

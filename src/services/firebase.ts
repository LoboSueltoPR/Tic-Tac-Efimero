// Inicialización de Firebase y helpers de Firestore para la colección `events`.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { AgendaEvent, EventInput } from '../types';
import { syncToGoogleCalendar } from './googleCalendar';

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
  const q = query(eventsCollection(), orderBy('date'), orderBy('start_time'));
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AgendaEvent
      );
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
    orderBy('date'),
    orderBy('start_time')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AgendaEvent);
}

export async function createEvent(input: EventInput): Promise<string> {
  const ref = await addDoc(eventsCollection(), {
    ...input,
    description: input.description ?? '',
    google_event_id: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  // Sync diferido a Google Calendar (no bloquea ni rompe si falla).
  syncToGoogleCalendar('create', { id: ref.id, ...input }).catch((e) =>
    console.warn('[googleCalendar] sync create falló', e)
  );
  return ref.id;
}

export async function updateEvent(
  id: string,
  patch: Partial<EventInput>
): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado (revisá .env).');
  await updateDoc(doc(db, COLLECTION, id), {
    ...patch,
    updated_at: serverTimestamp(),
  });
  syncToGoogleCalendar('update', { id, ...patch }).catch((e) =>
    console.warn('[googleCalendar] sync update falló', e)
  );
}

export async function deleteEvent(id: string): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado (revisá .env).');
  await deleteDoc(doc(db, COLLECTION, id));
  syncToGoogleCalendar('delete', { id }).catch((e) =>
    console.warn('[googleCalendar] sync delete falló', e)
  );
}

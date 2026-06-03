// Tipos centrales de la app de agenda.

export type Category = 'trabajo' | 'personal' | 'estudio' | 'salud' | 'otro';

/** Documento tal cual se guarda en Firestore (colección `events`). */
export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (24h)
  end_time: string; // HH:MM (24h)
  description?: string;
  category: Category;
  google_event_id?: string | null;
  created_at?: unknown;
  updated_at?: unknown;
}

/** Datos para crear/editar un evento (sin campos autogenerados). */
export type EventInput = Omit<
  AgendaEvent,
  'id' | 'created_at' | 'updated_at' | 'google_event_id'
> & {
  google_event_id?: string | null;
};

/** Evento adaptado para react-big-calendar. */
export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: AgendaEvent;
}

export const CATEGORIES: Category[] = [
  'trabajo',
  'personal',
  'estudio',
  'salud',
  'otro',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  trabajo: 'Trabajo',
  personal: 'Personal',
  estudio: 'Estudio',
  salud: 'Salud',
  otro: 'Otro',
};

/** Color por categoría (usado en el calendario y los chips). */
export const CATEGORY_COLORS: Record<Category, string> = {
  trabajo: '#2563eb', // azul
  personal: '#16a34a', // verde
  estudio: '#9333ea', // violeta
  salud: '#dc2626', // rojo
  otro: '#64748b', // gris
};

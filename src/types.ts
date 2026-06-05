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

export const CATEGORY_EMOJI: Record<Category, string> = {
  trabajo: '💼',
  personal: '🏠',
  estudio: '📚',
  salud: '🩺',
  otro: '📌',
};

/** Color sólido por categoría (chips y eventos del calendario). */
export const CATEGORY_COLORS: Record<Category, string> = {
  trabajo: '#4f46e5', // indigo
  personal: '#0d9488', // teal
  estudio: '#9333ea', // violeta
  salud: '#e11d48', // rosa/rojo
  otro: '#64748b', // gris
};

/** Fondo suave por categoría (badges). */
export const CATEGORY_SOFT: Record<Category, string> = {
  trabajo: '#eef2ff',
  personal: '#f0fdfa',
  estudio: '#faf5ff',
  salud: '#fff1f2',
  otro: '#f1f5f9',
};

// Hook que suscribe a Firestore en tiempo real y adapta los eventos para
// react-big-calendar (que necesita start/end como objetos Date).
import { useEffect, useMemo, useState } from 'react';
import { subscribeEvents } from '../services/firebase';
import type { AgendaEvent, CalendarEvent } from '../types';

/** Combina "YYYY-MM-DD" + "HH:MM" en un Date local. */
export function toDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

export function useEvents() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeEvents(
      (evs) => {
        setEvents(evs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      events.map((e) => ({
        title: e.title,
        start: toDate(e.date, e.start_time),
        end: toDate(e.date, e.end_time || e.start_time),
        resource: e,
      })),
    [events]
  );

  return { events, calendarEvents, loading, error };
}

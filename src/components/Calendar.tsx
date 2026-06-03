// Calendario visual con react-big-calendar, localizado en español.
import { useMemo } from 'react';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  type View,
} from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent, AgendaEvent } from '../types';
import { CATEGORY_COLORS } from '../types';

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const messages = {
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  allDay: 'Todo el día',
  week: 'Semana',
  work_week: 'Semana laboral',
  day: 'Día',
  month: 'Mes',
  previous: 'Anterior',
  next: 'Siguiente',
  yesterday: 'Ayer',
  tomorrow: 'Mañana',
  today: 'Hoy',
  agenda: 'Agenda',
  noEventsInRange: 'No hay eventos en este rango.',
  showMore: (total: number) => `+ Ver ${total} más`,
};

interface Props {
  events: CalendarEvent[];
  view: View;
  date: Date;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectEvent: (event: AgendaEvent) => void;
  onSelectSlot: (start: Date) => void;
}

export default function Calendar({
  events,
  view,
  date,
  onView,
  onNavigate,
  onSelectEvent,
  onSelectSlot,
}: Props) {
  const eventPropGetter = useMemo(
    () => (event: CalendarEvent) => {
      const color = CATEGORY_COLORS[event.resource.category] ?? '#64748b';
      return {
        style: {
          backgroundColor: color,
          color: 'white',
          borderRadius: '6px',
        },
      };
    },
    []
  );

  return (
    <BigCalendar
      localizer={localizer}
      culture="es"
      messages={messages}
      events={events}
      startAccessor="start"
      endAccessor="end"
      views={[Views.MONTH, Views.WEEK, Views.DAY]}
      view={view}
      date={date}
      onView={onView}
      onNavigate={onNavigate}
      onSelectEvent={(e) => onSelectEvent((e as CalendarEvent).resource)}
      onSelectSlot={(slot) => onSelectSlot(slot.start as Date)}
      selectable
      popup
      eventPropGetter={eventPropGetter}
      style={{ height: '100%' }}
    />
  );
}

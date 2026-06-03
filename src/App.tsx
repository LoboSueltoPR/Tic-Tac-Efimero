import { useState } from 'react';
import { Views, type View } from 'react-big-calendar';
import Calendar from './components/Calendar';
import Chat from './components/Chat';
import EventModal from './components/EventModal';
import { useEvents } from './hooks/useEvents';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  isFirebaseConfigured,
} from './services/firebase';
import type { AgendaEvent, EventInput } from './types';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from './types';

type ModalState =
  | { mode: 'view'; event: AgendaEvent }
  | { mode: 'create'; date: Date }
  | null;

export default function App() {
  const { calendarEvents, loading, error } = useEvents();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          🗓️ Agenda IA
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {CATEGORIES.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[c] }}
              />
              {CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>
      </header>

      {!isFirebaseConfigured && (
        <div className="bg-amber-50 px-5 py-2 text-center text-sm text-amber-700">
          ⚠️ Firebase no está configurado. Completá las variables{' '}
          <code className="rounded bg-amber-100 px-1">VITE_FIREBASE_*</code> en{' '}
          <code className="rounded bg-amber-100 px-1">.env</code> para persistir
          eventos.
        </div>
      )}
      {error && (
        <div className="bg-red-50 px-5 py-2 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cuerpo: calendario + chat */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden p-4">
          <div className="h-full rounded-xl bg-white p-3 shadow-sm">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                Cargando eventos…
              </div>
            ) : (
              <Calendar
                events={calendarEvents}
                view={view}
                date={date}
                onView={setView}
                onNavigate={setDate}
                onSelectEvent={(event) => setModal({ mode: 'view', event })}
                onSelectSlot={(start) =>
                  setModal({ mode: 'create', date: start })
                }
              />
            )}
          </div>
        </main>

        <aside className="hidden w-[360px] shrink-0 border-l border-slate-200 md:block">
          <Chat />
        </aside>
      </div>

      {modal && (
        <EventModal
          mode={modal.mode}
          event={modal.mode === 'view' ? modal.event : undefined}
          defaultDate={modal.mode === 'create' ? modal.date : undefined}
          onClose={() => setModal(null)}
          onCreate={(input: EventInput) => createEvent(input).then(() => {})}
          onUpdate={(id, input) => updateEvent(id, input)}
          onDelete={(id) => deleteEvent(id)}
        />
      )}
    </div>
  );
}

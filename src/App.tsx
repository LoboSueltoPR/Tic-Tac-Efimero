import { useState } from 'react';
import { Views, type View } from 'react-big-calendar';
import Calendar from './components/Calendar';
import Chat from './components/Chat';
import EventModal from './components/EventModal';
import { useEvents } from './hooks/useEvents';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  isFirebaseConfigured,
} from './services/firebase';
import type { AgendaEvent, EventInput } from './types';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from './types';

type ModalState =
  | { mode: 'view'; event: AgendaEvent }
  | { mode: 'create'; date: Date }
  | null;

function GoogleButton() {
  const { configured, connected, connecting, connect, disconnect } =
    useGoogleCalendar();

  if (connected) {
    return (
      <button
        onClick={disconnect}
        title="Desconectar Google Calendar"
        className="flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-white"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Google Calendar
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={!configured || connecting}
      title={
        configured
          ? 'Conectar tu Google Calendar'
          : 'Falta VITE_GOOGLE_CLIENT_ID en .env'
      }
      className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
    >
      <span>📆</span>
      {connecting ? 'Conectando…' : 'Conectar Google'}
    </button>
  );
}

export default function App() {
  const { calendarEvents, loading, error } = useEvents();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [modal, setModal] = useState<ModalState>(null);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen-safe flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-white shadow-md sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="text-2xl">🗓️</span> Agenda IA
          </h1>
          <GoogleButton />
        </div>
      </header>

      {/* Leyenda de categorías (oculta en mobile) */}
      <div className="hidden items-center gap-4 border-b border-slate-200 bg-white px-6 py-2 text-xs text-slate-500 sm:flex">
        <span className="font-semibold text-slate-400">Categorías:</span>
        {CATEGORIES.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[c] }}
            />
            {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
          </span>
        ))}
      </div>

      {/* Banners */}
      {!isFirebaseConfigured && (
        <div className="bg-amber-50 px-5 py-2 text-center text-sm text-amber-700">
          ⚠️ Firebase no está configurado. Completá las variables{' '}
          <code className="rounded bg-amber-100 px-1">VITE_FIREBASE_*</code> en{' '}
          <code className="rounded bg-amber-100 px-1">.env</code>.
        </div>
      )}
      {error && (
        <div className="bg-red-50 px-5 py-2 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cuerpo: calendario + chat */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden p-3 sm:p-5">
          <div className="h-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-5">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-500" />
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

        {/* Backdrop del drawer en mobile */}
        {chatOpen && (
          <div
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          />
        )}

        {/* Chat: columna fija en desktop, drawer en mobile */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-full max-w-sm transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
            chatOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <Chat onClose={() => setChatOpen(false)} />
        </aside>
      </div>

      {/* FAB para abrir el chat en mobile */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl shadow-lg transition hover:scale-105 lg:hidden"
          aria-label="Abrir asistente"
        >
          💬
        </button>
      )}

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

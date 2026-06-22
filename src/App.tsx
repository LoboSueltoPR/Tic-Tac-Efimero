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
        className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
        style={{ background: 'rgba(240,223,192,0.12)', color: '#f0dfc0', border: '1px solid rgba(240,223,192,0.2)' }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
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
      className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50"
      style={{ background: 'rgba(201,82,24,0.25)', color: '#f0dfc0', border: '1px solid rgba(201,82,24,0.4)' }}
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
    <div className="flex h-screen-safe flex-col" style={{ background: '#0e0a06' }}>
      {/* Header */}
      <header
        className="px-4 py-3 sm:px-6"
        style={{
          background: 'linear-gradient(135deg, #1c1208 0%, #2e1208 50%, #1c0e06 100%)',
          borderBottom: '1px solid #c9520833',
          boxShadow: '0 2px 20px rgba(168,30,10,0.2)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight" style={{ color: '#f0dfc0' }}>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-black"
              style={{ background: 'linear-gradient(135deg, #a81e0a, #c95218)', color: '#f0dfc0', letterSpacing: '-0.05em' }}
            >
              O
            </span>
            Agenda IA
          </h1>
          <GoogleButton />
        </div>
      </header>

      {/* Leyenda de categorías */}
      <div
        className="hidden items-center gap-4 px-6 py-2 text-xs sm:flex"
        style={{ background: '#1c1208', borderBottom: '1px solid #3a2010', color: '#a89070' }}
      >
        <span className="font-semibold" style={{ color: '#5c4030' }}>Categorías:</span>
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
        <div className="px-5 py-2 text-center text-sm" style={{ background: '#2a1a08', color: '#d4900b' }}>
          ⚠️ Firebase no está configurado. Completá las variables{' '}
          <code className="rounded px-1" style={{ background: '#3a2010' }}>VITE_FIREBASE_*</code> en{' '}
          <code className="rounded px-1" style={{ background: '#3a2010' }}>.env</code>.
        </div>
      )}
      {error && (
        <div className="px-5 py-2 text-center text-sm" style={{ background: '#2a0808', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Cuerpo: calendario + chat */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden p-3 sm:p-5">
          <div
            className="h-full overflow-hidden rounded-2xl p-3 sm:p-5"
            style={{ background: '#1c1208', border: '1px solid #3a2010' }}
          >
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3" style={{ color: '#a89070' }}>
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2"
                  style={{ borderColor: '#3a2010', borderTopColor: '#c95218' }}
                />
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
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(14,10,6,0.75)' }}
          />
        )}

        {/* Chat: columna fija en desktop, drawer en mobile */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-full max-w-sm transform transition-transform duration-300 lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
            chatOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
          style={{ background: '#1c1208', borderLeft: '1px solid #3a2010' }}
        >
          <Chat onClose={() => setChatOpen(false)} />
        </aside>
      </div>

      {/* FAB para abrir el chat en mobile */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full text-2xl transition hover:scale-105 lg:hidden"
          style={{ background: 'linear-gradient(135deg, #a81e0a, #c95218)', boxShadow: '0 4px 20px rgba(201,82,24,0.5)' }}
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

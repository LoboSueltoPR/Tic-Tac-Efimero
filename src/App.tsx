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

type Tab = 'chat' | 'calendar';

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
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
        style={{ background: 'rgba(240,223,192,0.1)', color: '#a89070', border: '1px solid rgba(240,223,192,0.15)' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Google
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={!configured || connecting}
      title={configured ? 'Conectar Google Calendar' : 'Falta VITE_GOOGLE_CLIENT_ID'}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
      style={{ background: 'rgba(201,82,24,0.2)', color: '#f0dfc0', border: '1px solid rgba(201,82,24,0.35)' }}
    >
      📆 {connecting ? 'Conectando…' : 'Google'}
    </button>
  );
}

export default function App() {
  const { calendarEvents, loading, error } = useEvents();
  const [tab, setTab] = useState<Tab>('chat');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="flex h-screen-safe flex-col" style={{ background: '#0e0a06' }}>

      {/* Header */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5"
        style={{
          background: 'linear-gradient(135deg, #1c1208 0%, #2e1208 60%, #1c0e06 100%)',
          borderBottom: '1px solid #c9520820',
          boxShadow: '0 2px 16px rgba(168,30,10,0.18)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black"
            style={{ background: 'linear-gradient(135deg, #a81e0a, #c95218)', color: '#f0dfc0' }}
          >
            T
          </span>
          <h1 className="text-base font-extrabold tracking-tight" style={{ color: '#f0dfc0' }}>
            Tictacefímero
          </h1>
        </div>
        <GoogleButton />
      </header>

      {/* Banners */}
      {!isFirebaseConfigured && (
        <div className="shrink-0 px-4 py-1.5 text-center text-xs" style={{ background: '#2a1a08', color: '#d4900b' }}>
          ⚠️ Firebase no configurado — completá <code style={{ background: '#3a2010', borderRadius: 4, padding: '0 4px' }}>VITE_FIREBASE_*</code> en .env
        </div>
      )}
      {error && (
        <div className="shrink-0 px-4 py-1.5 text-center text-xs" style={{ background: '#2a0808', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Cuerpo principal */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── DESKTOP: dos columnas — chat izq (40%), calendario der (60%) ── */}
        <div className="hidden flex-1 overflow-hidden lg:flex">

          {/* Chat */}
          <div
            className="flex w-[420px] shrink-0 flex-col overflow-hidden"
            style={{ borderRight: '1px solid #3a2010' }}
          >
            <Chat />
          </div>

          {/* Calendario */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Leyenda de categorías */}
            <div
              className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-2 text-xs"
              style={{ borderBottom: '1px solid #3a2010', background: '#160e06', color: '#a89070' }}
            >
              <span className="font-semibold" style={{ color: '#5c4030' }}>Categorías:</span>
              {CATEGORIES.map((c) => (
                <span key={c} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c] }} />
                  {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
                </span>
              ))}
            </div>
            <main className="flex-1 overflow-hidden p-4">
              <div
                className="h-full overflow-hidden rounded-xl p-4"
                style={{ background: '#1c1208', border: '1px solid #3a2010' }}
              >
                {loading ? <LoadingSpinner /> : (
                  <Calendar
                    events={calendarEvents}
                    view={view}
                    date={date}
                    onView={setView}
                    onNavigate={setDate}
                    onSelectEvent={(event) => setModal({ mode: 'view', event })}
                    onSelectSlot={(start) => setModal({ mode: 'create', date: start })}
                  />
                )}
              </div>
            </main>
          </div>
        </div>

        {/* ── MOBILE: vista única con tabs ── */}
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
          <div className="flex-1 overflow-hidden">
            {tab === 'chat' ? (
              <Chat />
            ) : (
              <div className="flex h-full flex-col overflow-hidden">
                {/* Leyenda categorías mobile */}
                <div
                  className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-xs"
                  style={{ borderBottom: '1px solid #3a2010', background: '#160e06', color: '#a89070' }}
                >
                  {CATEGORIES.map((c) => (
                    <span key={c} className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c] }} />
                      {CATEGORY_EMOJI[c]}
                    </span>
                  ))}
                </div>
                <main className="flex-1 overflow-hidden p-2">
                  <div
                    className="h-full overflow-hidden rounded-xl p-2"
                    style={{ background: '#1c1208', border: '1px solid #3a2010' }}
                  >
                    {loading ? <LoadingSpinner /> : (
                      <Calendar
                        events={calendarEvents}
                        view={view}
                        date={date}
                        onView={setView}
                        onNavigate={setDate}
                        onSelectEvent={(event) => setModal({ mode: 'view', event })}
                        onSelectSlot={(start) => setModal({ mode: 'create', date: start })}
                      />
                    )}
                  </div>
                </main>
              </div>
            )}
          </div>

          {/* Bottom tab bar */}
          <nav
            className="flex shrink-0 items-stretch"
            style={{
              background: '#1c1208',
              borderTop: '1px solid #3a2010',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {(
              [
                { id: 'chat', label: 'Asistente', icon: '💬' },
                { id: 'calendar', label: 'Calendario', icon: '📅' },
              ] as { id: Tab; label: string; icon: string }[]
            ).map(({ id, label, icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition"
                  style={{
                    color: active ? '#c95218' : '#5c4030',
                    borderTop: active ? '2px solid #c95218' : '2px solid transparent',
                    background: active ? 'rgba(201,82,24,0.06)' : 'transparent',
                  }}
                >
                  <span className="text-lg leading-none">{icon}</span>
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
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

function LoadingSpinner() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3" style={{ color: '#a89070' }}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{ borderColor: '#3a2010', borderTopColor: '#c95218' }}
      />
      Cargando eventos…
    </div>
  );
}

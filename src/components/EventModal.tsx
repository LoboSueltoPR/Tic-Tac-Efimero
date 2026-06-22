// Modal de detalle de evento (ver / editar / eliminar) y de creación manual.
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AgendaEvent, EventInput } from '../types';
import {
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CATEGORY_SOFT,
} from '../types';
import EventForm from './EventForm';

interface Props {
  mode: 'view' | 'create';
  event?: AgendaEvent;
  defaultDate?: Date;
  onClose: () => void;
  onCreate: (input: EventInput) => Promise<void>;
  onUpdate: (id: string, input: EventInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function ModalShell({
  title,
  children,
  onClose,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  accent?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: 'rgba(14,10,6,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl"
        style={{ background: '#1c1208', border: '1px solid #3a2010' }}
        onClick={(e) => e.stopPropagation()}
      >
        {accent && <div className="h-1.5 w-full" style={{ background: accent }} />}
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: '#f0dfc0' }}>{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition"
              style={{ color: '#5c4030' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0dfc0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5c4030')}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function formatFecha(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es });
  } catch {
    return dateStr;
  }
}

export default function EventModal({
  mode,
  event,
  defaultDate,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(mode === 'create');
  const [deleting, setDeleting] = useState(false);

  if (editing) {
    return (
      <ModalShell
        title={event ? '✏️ Editar evento' : '+ Nuevo evento'}
        onClose={onClose}
        accent={event ? CATEGORY_COLORS[event.category] : '#c95218'}
      >
        <EventForm
          initial={event}
          defaultDate={defaultDate}
          onCancel={mode === 'create' ? onClose : () => setEditing(false)}
          onSave={async (input) => {
            if (event) await onUpdate(event.id, input);
            else await onCreate(input);
            onClose();
          }}
        />
      </ModalShell>
    );
  }

  if (!event) return null;

  return (
    <ModalShell
      title="Detalle del evento"
      onClose={onClose}
      accent={CATEGORY_COLORS[event.category]}
    >
      <div className="space-y-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: CATEGORY_SOFT[event.category],
            color: CATEGORY_COLORS[event.category],
          }}
        >
          {CATEGORY_EMOJI[event.category]} {CATEGORY_LABELS[event.category]}
        </span>

        <h3 className="text-2xl font-bold leading-snug" style={{ color: '#f0dfc0' }}>
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm" style={{ color: '#a89070' }}>
          <p className="flex items-center gap-2 capitalize">
            <span>📅</span> {formatFecha(event.date)}
          </p>
          <p className="flex items-center gap-2">
            <span>🕒</span> {event.start_time} – {event.end_time}
          </p>
          {event.google_event_id && (
            <p className="flex items-center gap-2 text-xs" style={{ color: '#4ade80' }}>
              <span>✓</span> Sincronizado con Google Calendar
            </p>
          )}
        </div>

        {event.description && (
          <p
            className="whitespace-pre-wrap rounded-xl p-3.5 text-sm"
            style={{ background: '#160e06', color: '#f0dfc0', border: '1px solid #3a2010' }}
          >
            {event.description}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {deleting ? (
            <>
              <span className="self-center text-sm" style={{ color: '#a89070' }}>
                ¿Seguro?
              </span>
              <button
                onClick={() => setDeleting(false)}
                className="rounded-xl px-3.5 py-2.5 text-sm font-semibold transition"
                style={{ color: '#a89070' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2a1a0a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                No
              </button>
              <button
                onClick={async () => {
                  await onDelete(event.id);
                  onClose();
                }}
                className="rounded-xl px-3.5 py-2.5 text-sm font-semibold transition"
                style={{ background: '#7f1d1d', color: '#fca5a5' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#991b1b')}
                onMouseLeave={e => (e.currentTarget.style.background = '#7f1d1d')}
              >
                Sí, eliminar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDeleting(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                style={{ color: '#ef4444' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2a1010')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Eliminar
              </button>
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #a81e0a, #c95218)',
                  color: '#f0dfc0',
                  boxShadow: '0 2px 10px rgba(201,82,24,0.35)',
                }}
              >
                Editar
              </button>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

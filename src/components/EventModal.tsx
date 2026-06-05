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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {accent && <div className="h-1.5 w-full" style={{ background: accent }} />}
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
        title={event ? '✏️ Editar evento' : '✨ Nuevo evento'}
        onClose={onClose}
        accent={event ? CATEGORY_COLORS[event.category] : '#8b5cf6'}
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

        <h3 className="text-2xl font-bold leading-snug text-slate-800">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-slate-600">
          <p className="flex items-center gap-2 capitalize">
            <span>📅</span> {formatFecha(event.date)}
          </p>
          <p className="flex items-center gap-2">
            <span>🕒</span> {event.start_time} – {event.end_time}
          </p>
          {event.google_event_id && (
            <p className="flex items-center gap-2 text-xs text-emerald-600">
              <span>✓</span> Sincronizado con Google Calendar
            </p>
          )}
        </div>

        {event.description && (
          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700">
            {event.description}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {deleting ? (
            <>
              <span className="self-center text-sm text-slate-500">
                ¿Seguro?
              </span>
              <button
                onClick={() => setDeleting(false)}
                className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                No
              </button>
              <button
                onClick={async () => {
                  await onDelete(event.id);
                  onClose();
                }}
                className="rounded-xl bg-red-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
              >
                Sí, eliminar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDeleting(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
              >
                Eliminar
              </button>
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
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

// Modal de detalle de evento (ver / editar / eliminar) y de creación manual.
import { useState } from 'react';
import type { AgendaEvent, EventInput } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';
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
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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

  // Modo creación o edición → formulario.
  if (editing) {
    return (
      <ModalShell
        title={event ? 'Editar evento' : 'Nuevo evento'}
        onClose={onClose}
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

  // Modo vista.
  if (!event) return null;

  return (
    <ModalShell title="Detalle del evento" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
          />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {CATEGORY_LABELS[event.category]}
          </span>
        </div>

        <h3 className="text-xl font-semibold text-slate-800">{event.title}</h3>

        <p className="text-sm text-slate-600">
          📅 {event.date} &nbsp;·&nbsp; 🕒 {event.start_time} – {event.end_time}
        </p>

        {event.description && (
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {event.description}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-3">
          {deleting ? (
            <>
              <span className="self-center text-sm text-slate-600">
                ¿Eliminar?
              </span>
              <button
                onClick={() => setDeleting(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                No
              </button>
              <button
                onClick={async () => {
                  await onDelete(event.id);
                  onClose();
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sí, eliminar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDeleting(true)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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

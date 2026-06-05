// Formulario controlado para crear o editar un evento.
import { useState } from 'react';
import { format } from 'date-fns';
import type { AgendaEvent, Category, EventInput } from '../types';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from '../types';

interface Props {
  initial?: AgendaEvent;
  defaultDate?: Date;
  onSave: (input: EventInput) => Promise<void> | void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-500';

export default function EventForm({
  initial,
  defaultDate,
  onSave,
  onCancel,
}: Props) {
  const baseDate = initial?.date ?? format(defaultDate ?? new Date(), 'yyyy-MM-dd');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(baseDate);
  const [startTime, setStartTime] = useState(initial?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.end_time ?? '10:00');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<Category>(
    initial?.category ?? 'personal'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (endTime < startTime) {
      setError('La hora de fin no puede ser anterior a la de inicio.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        description: description.trim(),
        category,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Título</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Reunión con Martín"
          autoFocus
        />
      </div>

      <div>
        <label className={labelClass}>Fecha</label>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Inicio</label>
          <input
            type="time"
            className={inputClass}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Fin</label>
          <input
            type="time"
            className={inputClass}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Categoría</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
                style={active ? { backgroundColor: CATEGORY_COLORS[c] } : undefined}
              >
                <span>{CATEGORY_EMOJI[c]}</span>
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Descripción</label>
        <textarea
          className={inputClass}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

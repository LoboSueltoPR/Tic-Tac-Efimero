// Formulario controlado para crear o editar un evento.
import { useState } from 'react';
import { format } from 'date-fns';
import type { AgendaEvent, Category, EventInput } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../types';

interface Props {
  /** Evento a editar; si no se pasa, es creación. */
  initial?: AgendaEvent;
  /** Fecha por defecto al crear (clic en día vacío). */
  defaultDate?: Date;
  onSave: (input: EventInput) => Promise<void> | void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

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
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Título
        </label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Reunión con Martín"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Fecha
        </label>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Inicio
          </label>
          <input
            type="time"
            className={inputClass}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Fin
          </label>
          <input
            type="time"
            className={inputClass}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Categoría
        </label>
        <select
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Descripción
        </label>
        <textarea
          className={inputClass}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

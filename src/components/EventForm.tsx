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

const inputStyle = {
  background: '#0e0a06',
  border: '1px solid #3a2010',
  color: '#f0dfc0',
  borderRadius: '12px',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s, box-shadow 0.15s',
} as React.CSSProperties;

const labelStyle = {
  display: 'block',
  marginBottom: '0.375rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#5c4030',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

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

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#c95218';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,82,24,0.2)';
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#3a2010';
    e.currentTarget.style.boxShadow = 'none';
  }

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
      <Field label="Título">
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={focusStyle}
          onBlur={blurStyle}
          placeholder="Ej: Reunión con Martín"
          autoFocus
        />
      </Field>

      <Field label="Fecha">
        <input
          type="date"
          style={inputStyle}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio">
          <input
            type="time"
            style={inputStyle}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </Field>
        <Field label="Fin">
          <input
            type="time"
            style={inputStyle}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </Field>
      </div>

      <Field label="Categoría">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition"
                style={
                  active
                    ? { background: CATEGORY_COLORS[c], color: '#f0dfc0', border: '1px solid transparent', boxShadow: `0 2px 8px ${CATEGORY_COLORS[c]}55` }
                    : { background: '#0e0a06', color: '#a89070', border: '1px solid #3a2010' }
                }
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#c95218';
                    e.currentTarget.style.color = '#f0dfc0';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = '#3a2010';
                    e.currentTarget.style.color = '#a89070';
                  }
                }}
              >
                <span>{CATEGORY_EMOJI[c]}</span>
                {CATEGORY_LABELS[c]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Descripción">
        <textarea
          style={{ ...inputStyle, resize: 'none' }}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={focusStyle}
          onBlur={blurStyle}
          placeholder="Opcional"
        />
      </Field>

      {error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: '#2a1010', color: '#fca5a5', border: '1px solid #7f1d1d' }}
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
          style={{ color: '#a89070' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a1a0a')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #a81e0a, #c95218)',
            color: '#f0dfc0',
            boxShadow: '0 2px 10px rgba(201,82,24,0.35)',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

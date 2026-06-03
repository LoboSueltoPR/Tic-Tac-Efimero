// Llamadas a la Claude API con tool use (function calling) para gestionar la agenda.
import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  queryEventsInRange,
} from './firebase';
import type { Category, EventInput } from '../types';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const MODEL = 'claude-sonnet-4-20250514';

export const isClaudeConfigured = Boolean(apiKey);

const client = new Anthropic({
  apiKey: apiKey ?? '',
  // Uso personal/local: la key viaja al browser (decisión consciente).
  dangerouslyAllowBrowser: true,
});

/** Mensaje simple de la UI del chat. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const tools: Anthropic.Tool[] = [
  {
    name: 'create_event',
    description: 'Crea un nuevo evento en el calendario',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título del evento' },
        date: {
          type: 'string',
          description: 'Fecha en formato ISO 8601 (YYYY-MM-DD)',
        },
        start_time: { type: 'string', description: 'Hora de inicio HH:MM (24h)' },
        end_time: { type: 'string', description: 'Hora de fin HH:MM (24h)' },
        description: { type: 'string', description: 'Descripción opcional' },
        category: {
          type: 'string',
          enum: ['trabajo', 'personal', 'estudio', 'salud', 'otro'],
          description: 'Categoría del evento',
        },
      },
      required: ['title', 'date', 'start_time', 'end_time'],
    },
  },
  {
    name: 'list_events',
    description: 'Lista eventos en un rango de fechas',
    input_schema: {
      type: 'object',
      properties: {
        from_date: {
          type: 'string',
          description: 'Fecha de inicio del rango (YYYY-MM-DD)',
        },
        to_date: {
          type: 'string',
          description: 'Fecha de fin del rango (YYYY-MM-DD)',
        },
      },
      required: ['from_date', 'to_date'],
    },
  },
  {
    name: 'delete_event',
    description: 'Elimina un evento por su ID',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'ID del evento a eliminar' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'update_event',
    description: 'Modifica un evento existente',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'ID del evento a modificar' },
        title: { type: 'string' },
        date: { type: 'string' },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['event_id'],
    },
  },
];

function buildSystemPrompt(): string {
  const hoy = format(new Date(), 'yyyy-MM-dd');
  return `Sos un asistente personal de agenda. Hoy es ${hoy}.
Ayudás al usuario a gestionar su calendario de manera conversacional.

Cuando el usuario quiera agendar algo, extraé:
- Título del evento
- Fecha (interpretá expresiones como "el jueves", "mañana", "la semana que viene")
- Hora de inicio y fin (si no da fin, asumí 1 hora de duración)
- Categoría (inferila del contexto)

Siempre confirmá la acción realizada con un mensaje claro y amigable.
Si falta información clave (como la fecha o la hora), preguntá antes de crear el evento.
Respondé siempre en español informal (tuteo).`;
}

type ToolInput = Record<string, unknown>;

async function executeTool(name: string, input: ToolInput): Promise<unknown> {
  try {
    switch (name) {
      case 'create_event': {
        const data: EventInput = {
          title: String(input.title),
          date: String(input.date),
          start_time: String(input.start_time),
          end_time: String(input.end_time),
          description: input.description ? String(input.description) : '',
          category: (input.category as Category) ?? 'otro',
        };
        const id = await createEvent(data);
        return { success: true, event_id: id, event: data };
      }
      case 'list_events': {
        const events = await queryEventsInRange(
          String(input.from_date),
          String(input.to_date)
        );
        return { success: true, count: events.length, events };
      }
      case 'delete_event': {
        await deleteEvent(String(input.event_id));
        return { success: true };
      }
      case 'update_event': {
        const { event_id, ...rest } = input;
        const patch: Partial<EventInput> = {};
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined && v !== null && v !== '') {
            // @ts-expect-error asignación dinámica controlada por el schema
            patch[k] = v;
          }
        }
        await updateEvent(String(event_id), patch);
        return { success: true, event_id, patch };
      }
      default:
        return { success: false, error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Envía el historial del chat a Claude y corre el loop de tool use hasta que
 * Claude termina su turno. Devuelve el texto final de la respuesta.
 */
export async function sendChat(history: ChatMessage[]): Promise<string> {
  if (!apiKey) {
    throw new Error(
      'Falta VITE_ANTHROPIC_API_KEY en .env para usar el asistente.'
    );
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const system = buildSystemPrompt();

  // Loop del agente: mientras Claude pida tools, las ejecutamos y seguimos.
  for (let i = 0; i < 8; i++) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(
            block.name,
            block.input as ToolInput
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Turno terminado: juntamos el texto de la respuesta.
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || '(sin respuesta)';
  }

  return 'Se alcanzó el límite de pasos del asistente. Probá reformular el pedido.';
}

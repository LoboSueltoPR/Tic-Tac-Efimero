// Webhook UltraMsg → Groq → Google Calendar
import Groq from 'groq-sdk';
import { google } from 'googleapis';
import { format } from 'date-fns';

// ── Google Calendar ───────────────────────────────────────────────────────────
function getCalendar() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

const TZ = 'America/Argentina/Buenos_Aires';

async function gcalCreate(data) {
  const cal = getCalendar();
  const res = await cal.events.insert({
    calendarId: 'primary',
    resource: {
      summary:     data.title,
      description: data.description || '',
      start: { dateTime: `${data.date}T${data.start_time}:00`, timeZone: TZ },
      end:   { dateTime: `${data.date}T${data.end_time}:00`,   timeZone: TZ },
    },
  });
  return res.data.id;
}

async function gcalList(from, to) {
  const cal = getCalendar();
  const res = await cal.events.list({
    calendarId:   'primary',
    timeMin:      `${from}T00:00:00-03:00`,
    timeMax:      `${to}T23:59:59-03:00`,
    singleEvents: true,
    orderBy:      'startTime',
    maxResults:   20,
  });
  return (res.data.items || []).map(e => ({
    id:         e.id,
    title:      e.summary,
    start_time: e.start?.dateTime?.slice(11, 16) ?? '',
    end_time:   e.end?.dateTime?.slice(11, 16) ?? '',
    date:       e.start?.dateTime?.slice(0, 10) ?? '',
  }));
}

async function gcalDelete(id) {
  const cal = getCalendar();
  await cal.events.delete({ calendarId: 'primary', eventId: id });
}

async function gcalUpdate(id, data) {
  const cal = getCalendar();
  const patch = {};
  if (data.title)       patch.summary     = data.title;
  if (data.description) patch.description = data.description;
  if (data.date && data.start_time)
    patch.start = { dateTime: `${data.date}T${data.start_time}:00`, timeZone: TZ };
  if (data.date && data.end_time)
    patch.end   = { dateTime: `${data.date}T${data.end_time}:00`,   timeZone: TZ };
  await cal.events.patch({ calendarId: 'primary', eventId: id, resource: patch });
}

// ── Groq ──────────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: 'Crea un nuevo evento en Google Calendar',
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string' },
          date:        { type: 'string', description: 'YYYY-MM-DD' },
          start_time:  { type: 'string', description: 'HH:MM (24h)' },
          end_time:    { type: 'string', description: 'HH:MM (24h)' },
          description: { type: 'string' },
        },
        required: ['title', 'date', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'Lista eventos de Google Calendar en un rango de fechas',
      parameters: {
        type: 'object',
        properties: {
          from_date: { type: 'string', description: 'YYYY-MM-DD' },
          to_date:   { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['from_date', 'to_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Elimina un evento de Google Calendar por su ID',
      parameters: {
        type: 'object',
        properties: { event_id: { type: 'string' } },
        required: ['event_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event',
      description: 'Modifica un evento de Google Calendar',
      parameters: {
        type: 'object',
        properties: {
          event_id:    { type: 'string' },
          title:       { type: 'string' },
          date:        { type: 'string' },
          start_time:  { type: 'string' },
          end_time:    { type: 'string' },
          description: { type: 'string' },
        },
        required: ['event_id'],
      },
    },
  },
];

async function executeTool(name, args) {
  try {
    switch (name) {
      case 'create_event': {
        const id = await gcalCreate(args);
        return { success: true, event_id: id, event: args };
      }
      case 'list_events': {
        const events = await gcalList(String(args.from_date), String(args.to_date));
        return { success: true, count: events.length, events };
      }
      case 'delete_event':
        await gcalDelete(String(args.event_id));
        return { success: true };
      case 'update_event': {
        const { event_id, ...patch } = args;
        await gcalUpdate(String(event_id), patch);
        return { success: true };
      }
      default:
        return { success: false, error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

async function processMessage(text) {
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const messages = [
    {
      role: 'system',
      content: `Sos un asistente personal de agenda que opera vía WhatsApp y guarda en Google Calendar.
Hoy es ${hoy} (zona horaria: Argentina, UTC-3).

Reglas:
- Para CREAR: extraé título, fecha (interpretá "mañana", "el jueves", "la semana que viene", etc.), hora inicio y fin (si no da fin asumí 1 hora de duración), descripción opcional. Si falta fecha u hora, preguntá antes de crear.
- Para MODIFICAR o BORRAR: si el usuario no da el ID del evento, primero llamá a list_events en el rango de fechas probable para encontrarlo, luego usá el ID correcto para update_event o delete_event. Nunca le pidas al usuario el ID — buscálo vos.
- Confirmá cada acción con un mensaje corto y amigable en español informal.`,
    },
    { role: 'user', content: text },
  ];

  for (let i = 0; i < 8; i++) {
    const resp = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 512,
      temperature: 0.3,
      tools: TOOLS,
      tool_choice: 'auto',
      messages,
    });

    const msg = resp.choices[0]?.message;
    if (!msg) return '(sin respuesta)';
    messages.push(msg);

    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /**/ }
        const result = await executeTool(tc.function.name, args);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    return (msg.content ?? '').trim() || '(sin respuesta)';
  }
  return 'Se alcanzó el límite de pasos. Reformulá el pedido.';
}

// ── Green API ─────────────────────────────────────────────────────────────────
const OWNER_CHAT_ID = `${process.env.OWNER_PHONE}@c.us`;

async function gaSend(text) {
  const base = `https://api.green-api.com/waInstance${process.env.GREEN_ID_INSTANCE}`;
  const token = process.env.GREEN_API_TOKEN;
  const res = await fetch(`${base}/sendMessage/${token}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chatId: OWNER_CHAT_ID, message: text }),
  });
  const json = await res.json().catch(() => ({}));
  console.log('GREEN_SEND:', JSON.stringify(json));
  return json?.idMessage ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Tic Tac Efimero Bot — OK');

  try {
    const body = req.body ?? {};
    const { typeWebhook, senderData, messageData } = body;

    console.log('TYPE:', typeWebhook, '| FROM:', senderData?.chatId, '| MSG_TYPE:', messageData?.typeMessage);

    // incomingMessageReceived = mensajes que llegan al celular
    // outgoingMessageReceived = mensajes enviados desde el celular (auto-mensajes)
    // outgoingAPIMessageReceived = respuestas del bot → IGNORAR
    const validType = typeWebhook === 'incomingMessageReceived' || typeWebhook === 'outgoingMessageReceived';
    if (!validType) return res.status(200).json({ ok: true });
    if (messageData?.typeMessage !== 'textMessage') return res.status(200).json({ ok: true });

    const fromChatId = senderData?.chatId ?? '';
    console.log('TYPE:', typeWebhook, '| FROM:', fromChatId, '| OWNER:', OWNER_CHAT_ID);

    // Solo procesar auto-mensajes (chat del owner = mensaje a uno mismo)
    if (fromChatId !== OWNER_CHAT_ID) return res.status(200).json({ ok: true });

    const text = messageData?.textMessageData?.textMessage?.trim();
    if (!text) return res.status(200).json({ ok: true });

    console.log('PROCESANDO:', text);
    const reply = await processMessage(text);
    console.log('RESPUESTA:', reply?.slice(0, 80));

    await gaSend(reply);
    console.log('ENVIADO');

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('ERROR:', err?.message, err?.stack?.slice(0, 200));
    return res.status(200).json({ ok: false });
  }
}

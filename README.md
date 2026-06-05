# Agenda IA 🗓️🤖

Agenda personal que combina un **calendario visual** con un **asistente de IA**
capaz de agendar, consultar, editar y eliminar eventos en lenguaje natural. Sin
autenticación (uso personal). Persistencia en **Firebase Firestore** en tiempo
real.

## Stack

- **React + Vite + TypeScript**
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`)
- **react-big-calendar** + **date-fns** (localizado en español)
- **Firebase Firestore** (`onSnapshot` en tiempo real)
- **Groq** (`llama-3.3-70b-versatile`, API compatible con OpenAI) con tool use /
  function calling — free tier, key gratis en https://console.groq.com/keys
- Google Calendar — **diferido** (ver más abajo)

## Puesta en marcha

```bash
npm install
cp .env.example .env   # y completá los valores
npm run dev            # http://localhost:5174
```

> En esta máquina Node se instaló vía winget y no queda en el PATH de shells
> nuevos. El preview server (`.claude/launch.json` → config `agenda-ia`)
> recarga el PATH y llama a `npm.cmd` para evitar la ExecutionPolicy Restricted.

### Variables de entorno (`.env`)

| Variable | Para qué |
|---|---|
| `VITE_GROQ_API_KEY` | Asistente de IA (Groq) |
| `VITE_FIREBASE_*` | Config web del proyecto Firebase |
| `VITE_GCAL_SYNC_URL` | URL del backend de Google Calendar (diferido) |

La app **corre sin credenciales**: muestra avisos y el calendario vacío. Con
Firebase configurado persiste eventos; con la key de Groq se habilita el chat.

> ⚠️ Las `VITE_*` quedan expuestas en el bundle del cliente. Es una decisión
> consciente para uso 100% personal/local.

## Arquitectura

```
src/
├── components/
│   ├── Calendar.tsx     # react-big-calendar (mes/semana/día, colores por categoría)
│   ├── Chat.tsx         # panel del asistente, historial y sugerencias
│   ├── EventModal.tsx   # ver / editar / eliminar / crear
│   └── EventForm.tsx    # formulario controlado
├── services/
│   ├── firebase.ts      # init + CRUD + subscribeEvents (onSnapshot)
│   ├── ai.ts            # Groq: tools + loop de tool use
│   └── googleCalendar.ts# stub diferido (no-op)
├── hooks/
│   └── useEvents.ts      # suscripción en tiempo real → CalendarEvent[]
├── types.ts              # AgendaEvent, categorías, colores
└── App.tsx
```

### Firestore — colección `events`

```jsonc
{
  "title": "Reunión con Martín",
  "date": "2026-06-10",         // YYYY-MM-DD
  "start_time": "15:00",         // HH:MM (24h)
  "end_time": "16:00",
  "description": "...",
  "category": "trabajo",         // trabajo | personal | estudio | salud | otro
  "google_event_id": null,
  "created_at": "<serverTimestamp>",
  "updated_at": "<serverTimestamp>"
}
```

`date` se guarda como string para permitir consultas de rango
(`where('date','>=',from)`).

### Tools de la IA

`create_event`, `list_events`, `delete_event`, `update_event`. El loop en
`ai.ts` ejecuta las tools contra Firestore y reinyecta los resultados hasta que
el modelo termina su turno. Al escribir/borrar en Firestore, `onSnapshot`
refresca el calendario automáticamente.

## Pendiente: sincronización con Google Calendar

Está **diferida** (ver `services/googleCalendar.ts`). Requiere un backend porque
el service account (clave privada) no puede vivir en el cliente. Plan:

1. Crear un service account en Google Cloud con la Calendar API habilitada.
2. Compartir tu calendario personal con el email del service account.
3. Una **Firebase Cloud Function** (requiere plan Blaze) que reciba
   `{ action, eventData }`, ejecute la llamada a la Calendar API y devuelva el
   `google_event_id`.
4. Guardar ese id en el documento de Firestore para editar/eliminar después.
5. Completar `VITE_GCAL_SYNC_URL` con la URL de la función.

`firebase.ts` ya llama a `syncToGoogleCalendar('create'|'update'|'delete', …)`
de forma no bloqueante: si falla o no está configurado, el evento igual se
guarda en Firestore.

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

## Sincronización con Google Calendar

Implementada **100% en el navegador** con Google Identity Services (OAuth2), sin
backend ni service account (gratis). El usuario toca **"Conectar Google"**,
autoriza el acceso a su calendario, y la app crea/edita/elimina eventos vía la
Calendar API REST. El `id` que devuelve Google se guarda en Firestore como
`google_event_id` (`services/googleCalendar.ts` + `services/firebase.ts`).

Si Google Calendar no está conectado o falla, el evento igual se guarda en
Firestore (la sync es no bloqueante).

### Configuración (una vez, gratis)

1. **Google Cloud Console** → proyecto `tictacefimero` (el mismo de Firebase).
2. Habilitá la **Google Calendar API**
   (APIs y servicios → Biblioteca → "Google Calendar API" → Habilitar).
3. **Pantalla de consentimiento OAuth**: tipo "Externo", completá nombre/email,
   agregá el scope `.../auth/calendar.events`, y sumá tu cuenta como
   **usuario de prueba** (o publicá la app).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth →
   Aplicación web**. En *Orígenes de JavaScript autorizados* agregá:
   - `http://localhost:5174`
   - `https://tictacefimero.web.app`
5. Copiá el **Client ID** (`xxxxx.apps.googleusercontent.com`) a `.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   VITE_GOOGLE_CALENDAR_ID=primary
   ```
6. `npm run build && firebase deploy --only hosting`.

> Nota: como es OAuth de cliente, cada quien sincroniza **su propio** calendario
> al conectarse; no se comparte una cuenta central.

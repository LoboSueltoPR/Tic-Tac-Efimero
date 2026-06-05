// Panel de chat con el asistente de IA (Groq + tool use).
import { useEffect, useRef, useState } from 'react';
import { sendChat, isAIConfigured, type ChatMessage } from '../services/ai';

const SUGGESTIONS = [
  '📅 Agendá una reunión mañana a las 15',
  '🔎 ¿Qué tengo esta semana?',
  '🗑️ Cancelá mi última reunión',
];

export default function Chat({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! 👋 Soy tu asistente de agenda. Pedime que agende, consulte o elimine eventos en lenguaje natural.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.replace(/^[^\w¿¡]+/, '').trim();
    if (!content || busy) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setBusy(true);

    try {
      const reply = await sendChat(history);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `⚠️ ${err instanceof Error ? err.message : 'Error al hablar con el asistente.'}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg shadow-sm">
          🤖
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-800">Asistente</h2>
          <p className="truncate text-xs text-slate-400">
            {isAIConfigured ? 'Listo para ayudarte' : 'Falta VITE_GROQ_API_KEY'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Cerrar chat"
          >
            ✕
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
                  : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 bg-slate-50/60 px-4 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
          placeholder="Escribí un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md transition hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar"
        >
          ➤
        </button>
      </form>
    </div>
  );
}

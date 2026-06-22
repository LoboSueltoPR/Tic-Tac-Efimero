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
        '¡Hola! Soy tu asistente de agenda. Pedime que agende, consulte o elimine eventos en lenguaje natural.',
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
    <div className="flex h-full flex-col" style={{ background: '#1c1208' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #3a2010' }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-black"
          style={{ background: 'linear-gradient(135deg, #a81e0a, #c95218)', color: '#f0dfc0' }}
        >
          IA
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold" style={{ color: '#f0dfc0' }}>Asistente</h2>
          <p className="truncate text-xs" style={{ color: '#5c4030' }}>
            {isAIConfigured ? 'Listo para ayudarte' : 'Falta VITE_GROQ_API_KEY'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-2 transition lg:hidden"
            style={{ color: '#5c4030' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0dfc0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5c4030')}
            aria-label="Cerrar chat"
          >
            ✕
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        style={{ background: '#160e06' }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm"
              style={
                m.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #a81e0a, #c95218)',
                      color: '#f0dfc0',
                      borderBottomRightRadius: '4px',
                      boxShadow: '0 2px 8px rgba(168,30,10,0.4)',
                    }
                  : {
                      background: '#2a1a0a',
                      color: '#f0dfc0',
                      border: '1px solid #3a2010',
                      borderBottomLeftRadius: '4px',
                    }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div
              className="flex gap-1 rounded-2xl px-4 py-3"
              style={{ background: '#2a1a0a', border: '1px solid #3a2010', borderBottomLeftRadius: '4px' }}
            >
              <span className="h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" style={{ background: '#c95218' }} />
              <span className="h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" style={{ background: '#c95218' }} />
              <span className="h-2 w-2 animate-bounce rounded-full" style={{ background: '#c95218' }} />
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3" style={{ background: '#160e06' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition"
              style={{ background: '#2a1a0a', border: '1px solid #3a2010', color: '#a89070' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#c95218';
                e.currentTarget.style.color = '#f0dfc0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#3a2010';
                e.currentTarget.style.color = '#a89070';
              }}
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
        className="flex items-center gap-2 p-3"
        style={{ borderTop: '1px solid #3a2010' }}
      >
        <input
          className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition"
          style={{
            background: '#0e0a06',
            border: '1px solid #3a2010',
            color: '#f0dfc0',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#c95218';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,82,24,0.2)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#3a2010';
            e.currentTarget.style.boxShadow = 'none';
          }}
          placeholder="Escribí un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #a81e0a, #c95218)', boxShadow: '0 2px 10px rgba(201,82,24,0.4)' }}
          aria-label="Enviar"
        >
          ➤
        </button>
      </form>
    </div>
  );
}

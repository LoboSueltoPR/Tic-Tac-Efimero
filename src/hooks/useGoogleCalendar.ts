// Estado de conexión con Google Calendar para la UI.
import { useEffect, useState } from 'react';
import {
  connect,
  disconnect,
  isConnected,
  isGoogleCalendarConfigured,
  onConnectionChange,
  tryAutoConnect,
} from '../services/googleCalendar';

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(isConnected());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onConnectionChange(setConnected);
    // Reconexión silenciosa si ya autorizó antes.
    tryAutoConnect();
    return unsub;
  }, []);

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar.');
    } finally {
      setConnecting(false);
    }
  }

  return {
    configured: isGoogleCalendarConfigured,
    connected,
    connecting,
    error,
    connect: handleConnect,
    disconnect,
  };
}

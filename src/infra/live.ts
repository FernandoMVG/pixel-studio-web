import type { WsMessage } from '@api';
import { API_URL } from './api.ts';

export type LiveStatus = 'connecting' | 'open' | 'closed';

/**
 * Escucha los parches de un proyecto (de cualquier sesión: la web, el agente…) y reconecta solo.
 * Con `'*'` escucha todos los proyectos, más las altas y bajas.
 * Devuelve la función para dejar de escuchar.
 */
export function subscribe(projectId: string, onMessage: (m: WsMessage) => void, onStatus: (s: LiveStatus) => void = () => {}): () => void {
  const url = `${API_URL.replace(/^http/, 'ws')}/ws?project=${encodeURIComponent(projectId)}`;
  let socket: WebSocket | null = null;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const connect = () => {
    onStatus('connecting');
    socket = new WebSocket(url);
    socket.onopen = () => {
      retry = 0;
      onStatus('open');
    };
    socket.onmessage = (e) => onMessage(JSON.parse(e.data as string) as WsMessage);
    socket.onclose = () => {
      onStatus('closed');
      if (stopped) return;
      timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 10_000)); // 1 s, 2 s, 4 s… hasta 10 s
    };
  };
  connect();

  return () => {
    stopped = true;
    clearTimeout(timer);
    socket?.close();
  };
}

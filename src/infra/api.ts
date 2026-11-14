import type { AgentPermissions, ApiError, Command, Patch, Project, Settings } from '@api';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4317';

/** Una pestaña = una sesión de historial: deshacer solo revierte lo hecho aquí. */
export const SESSION_ID = crypto.randomUUID();

/** La API respondió con error: `messages` vienen en español, listos para mostrar. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly messages: string[];
  constructor(status: number, messages: string[]) {
    super(messages.join('\n'));
    this.status = status;
    this.messages = messages;
  }
}

/** No se pudo hablar con pixel-api (apagado o sin red). La UI muestra la pantalla "Sin conexión". */
export class ApiOfflineError extends Error {
  constructor() {
    super(`No se puede conectar con pixel-api en ${API_URL}`);
  }
}

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: init?.method ?? 'GET',
      headers: init?.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiOfflineError();
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiRequestError(res.status, (data as ApiError | null)?.errors ?? [`Error ${res.status}`]);
  return data as T;
}

export type NewProject = { name: string; width?: number; height?: number; palette: Project['palette'] };
export type ExportKind = 'frame.png' | 'sheet.png' | 'animation.gif' | 'animation.txt';

export const api = {
  listProjects: async () => (await request<{ projects: Project[] }>('/projects')).projects,
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (input: NewProject) => request<Project>('/projects', { method: 'POST', body: input }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  /** Lote atómico: todos los comandos o ninguno; es un solo paso de deshacer. */
  apply: async (id: string, commands: Command[]) =>
    (await request<{ patches: Patch[] }>(`/projects/${id}/commands`, { method: 'POST', body: { sessionId: SESSION_ID, commands } })).patches,
  undo: async (id: string) => (await request<{ patches: Patch[] }>(`/projects/${id}/undo`, { method: 'POST', body: { sessionId: SESSION_ID } })).patches,
  redo: async (id: string) => (await request<{ patches: Patch[] }>(`/projects/${id}/redo`, { method: 'POST', body: { sessionId: SESSION_ID } })).patches,

  getSettings: () => request<Settings>('/settings'),
  updateAgent: (patch: Partial<AgentPermissions>) => request<Settings>('/settings/agent', { method: 'PUT', body: patch }),

  /** URL directa para <img>, descargas o vista previa. */
  exportUrl: (id: string, kind: ExportKind, params: { animation: string; frame?: number; scale?: number }) => {
    const q = new URLSearchParams({ animation: params.animation });
    if (params.frame !== undefined) q.set('frame', String(params.frame));
    if (params.scale !== undefined) q.set('scale', String(params.scale));
    return `${API_URL}/projects/${id}/export/${kind}?${q}`;
  },
};

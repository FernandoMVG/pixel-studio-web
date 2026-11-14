export type Cell = { x: number; y: number; color: string };
export type Draft = { animation: string; frame: number; cells: Cell[] };
export type Author = 'tu' | 'agente' | 'otra';
export type HistoryEntry = { id: number; by: Author; text: string };
/** Envía un lote a la API. Devuelve `null` si salió bien o los mensajes de error. */
export type Send = (commands: import('@api').Command[], opts?: { quiet?: boolean }) => Promise<string[] | null>;

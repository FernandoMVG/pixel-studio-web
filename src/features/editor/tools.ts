import type { Cell } from './types.ts';

export type Tool = 'pencil' | 'eraser' | 'bucket' | 'picker' | 'line' | 'rect' | 'select';

export const TOOLS: { id: Tool; icon: string; label: string; key: string }[] = [
  { id: 'pencil', icon: 'pencil', label: 'Lápiz', key: 'B' },
  { id: 'eraser', icon: 'eraser', label: 'Borrador', key: 'E' },
  { id: 'bucket', icon: 'bucket', label: 'Relleno', key: 'G' },
  { id: 'picker', icon: 'picker', label: 'Cuentagotas', key: 'I' },
  { id: 'line', icon: 'line', label: 'Línea', key: 'L' },
  { id: 'rect', icon: 'rect', label: 'Rectángulo', key: 'U' },
  { id: 'select', icon: 'select', label: 'Selección', key: 'M' },
];

type Pt = { x: number; y: number };
/** Rectángulo de celdas, ambos extremos incluidos. */
export type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Bresenham: celdas de la recta entre dos puntos, ambos incluidos. */
export function lineCells(a: Pt, b: Pt, color: string): Cell[] {
  const out: Cell[] = [];
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx + dy;
  let { x, y } = a;
  for (;;) {
    out.push({ x, y, color });
    if (x === b.x && y === b.y) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/** Contorno de un rectángulo entre dos esquinas. */
export function rectCells(a: Pt, b: Pt, color: string): Cell[] {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return [...lineCells({ x: x0, y: y0 }, { x: x1, y: y0 }, color), ...lineCells({ x: x0, y: y1 }, { x: x1, y: y1 }, color),
    ...lineCells({ x: x0, y: y0 }, { x: x0, y: y1 }, color), ...lineCells({ x: x1, y: y0 }, { x: x1, y: y1 }, color)];
}

/** Rectángulo normalizado entre dos esquinas. */
export const rectBetween = (a: Pt, b: Pt): Rect => ({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });

export const inRect = (r: Rect, p: Pt) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;

/** Desplaza un rectángulo y lo recorta al lienzo; `null` si queda fuera entero. */
export function shiftRect(r: Rect, dx: number, dy: number, w: number, h: number): Rect | null {
  const x0 = Math.max(0, r.x0 + dx), y0 = Math.max(0, r.y0 + dy), x1 = Math.min(w - 1, r.x1 + dx), y1 = Math.min(h - 1, r.y1 + dy);
  return x0 > x1 || y0 > y1 ? null : { x0, y0, x1, y1 };
}

/**
 * Celdas que cambian al mover (o copiar) los píxeles opacos de `r` en (dx, dy).
 * Los huecos transparentes no tapan el destino; lo que sale del lienzo se pierde.
 */
export function moveCells(rows: readonly string[], r: Rect, dx: number, dy: number, copy: boolean): Cell[] {
  const h = rows.length, w = rows[0]?.length ?? 0;
  const out = new Map<string, Cell>();
  const put = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < w && y < h) out.set(`${x},${y}`, { x, y, color: c }); };
  const src: Cell[] = [];
  for (let y = Math.max(0, r.y0); y <= Math.min(h - 1, r.y1); y++)
    for (let x = Math.max(0, r.x0); x <= Math.min(w - 1, r.x1); x++) if (rows[y]![x] !== '.') src.push({ x, y, color: rows[y]![x]! });
  if (!copy) for (const s of src) put(s.x, s.y, '.');
  for (const s of src) put(s.x + dx, s.y + dy, s.color);
  return [...out.values()].filter((c) => rows[c.y]![c.x] !== c.color);
}

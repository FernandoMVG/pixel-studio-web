import type { Cell } from './types.ts';

export type Tool = 'pencil' | 'eraser' | 'bucket' | 'picker' | 'line' | 'rect';

export const TOOLS: { id: Tool; icon: string; label: string; key: string }[] = [
  { id: 'pencil', icon: 'pencil', label: 'Lápiz', key: 'B' },
  { id: 'eraser', icon: 'eraser', label: 'Borrador', key: 'E' },
  { id: 'bucket', icon: 'bucket', label: 'Relleno', key: 'G' },
  { id: 'picker', icon: 'picker', label: 'Cuentagotas', key: 'I' },
  { id: 'line', icon: 'line', label: 'Línea', key: 'L' },
  { id: 'rect', icon: 'rect', label: 'Rectángulo', key: 'U' },
];

type Pt = { x: number; y: number };

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

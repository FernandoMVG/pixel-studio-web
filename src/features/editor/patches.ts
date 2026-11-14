import type { Frame, Patch, Project } from '@api';

/**
 * Aplica un parche que llegó de pixel-api (lado `after`), igual que hace la API.
 * La web no decide nada: solo refleja lo que el servidor ya guardó.
 */
export function applyPatch(project: Project, patch: Patch): Project {
  if (patch.kind === 'palette') return { ...project, palette: patch.after };
  const animations = [...project.animations];
  if (patch.kind === 'animation') {
    const { index, before, after } = patch;
    if (before === null) animations.splice(index, 0, after!);
    else if (after === null) animations.splice(index, 1);
    else animations[index] = after;
    return { ...project, animations };
  }
  const a = animations.findIndex((x) => x.name === patch.animation);
  const anim = animations[a];
  const rows = anim?.frames[patch.frame];
  if (!anim || !rows) return project; // la estructura cambió por otra vía; la siguiente recarga lo corrige
  const next = [...rows];
  for (const c of patch.changes) next[c.y] = setChar(next[c.y]!, c.x, c.after);
  const frames = [...anim.frames];
  frames[patch.frame] = next;
  animations[a] = { ...anim, frames };
  return { ...project, animations };
}

export const setChar = (row: string, x: number, c: string) => row.slice(0, x) + c + row.slice(x + 1);

/** Píxeles de un trazo en curso, pintados en local antes de enviarlos (respuesta instantánea). */
export function paintCells(rows: Frame, cells: { x: number; y: number; color: string }[]): Frame {
  const next = [...rows];
  for (const { x, y, color } of cells) next[y] = setChar(next[y]!, x, color);
  return next;
}

/** Celdas que cambiaría un relleno desde (x, y): para la vista previa local. El servidor hace el relleno real. */
export function fillCells(rows: Frame, x: number, y: number, color: string): { x: number; y: number; color: string }[] {
  const from = rows[y]?.[x];
  if (from === undefined || from === color) return [];
  const out: { x: number; y: number; color: string }[] = [];
  const seen = new Set<string>();
  const stack: [number, number][] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    const key = `${cx},${cy}`;
    if (seen.has(key) || rows[cy]?.[cx] !== from) continue;
    seen.add(key);
    out.push({ x: cx, y: cy, color });
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return out;
}

import type { Patch, PixelPatch } from '@api';

const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

/** Texto llano de un lote de parches para el panel Historial. `null` si no cambió nada. */
export function describePatches(patches: Patch[]): string | null {
  const labels = new Set<string>();
  let px = 0;
  let first: PixelPatch | undefined;
  for (const p of patches) {
    if (p.kind === 'pixels') {
      px += p.changes.length;
      first ??= p;
    } else if (p.kind === 'palette') labels.add('Paleta cambiada');
    else if (!p.before && p.after) labels.add(`Animación '${p.after.name}' creada`);
    else if (p.before && !p.after) labels.add(`Animación '${p.before.name}' borrada`);
    else if (p.before && p.after && p.before.name !== p.after.name) labels.add(`Animación '${p.before.name}' renombrada a '${p.after.name}'`);
    else if (p.before && p.after && p.before.frames.length === p.after.frames.length && p.before.fps !== p.after.fps) labels.add(`Velocidad de '${p.after.name}'`);
    else if (p.after) labels.add(`Cuadros de '${p.after.name}'`);
  }
  const out = [...(first && px ? [`${plural(px, 'píxel', 'píxeles')}, ${first.animation}, cuadro ${first.frame + 1}`] : []), ...labels];
  return out.length ? out.join('; ') : null;
}

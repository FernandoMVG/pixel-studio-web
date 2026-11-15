import { useEffect, useRef, useState } from 'react';
import type { Project } from '@api';

type Props = {
  project: Project;
  animation?: string;
  frame?: number;
  zoom?: number;
  /** Lado de la caja en px: ajusta el zoom para que el lado mayor del lienzo mida eso (manda sobre `zoom`). */
  size?: number;
  /** 'hover' reproduce solo mientras el puntero está sobre el ancestro `.card`. */
  play?: 'always' | 'hover' | false;
};

/** Cuadro que toca en el tic `tick`: cada cuadro se queda tantos tics como su duración. */
export function frameAt(holds: number[], tick: number) {
  let t = tick % holds.reduce((a, b) => a + b, 0);
  let i = 0;
  while (t >= holds[i]!) t -= holds[i++]!;
  return i;
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Sprite({ project, animation, frame = 0, zoom: z = 4, size, play = false }: Props) {
  const zoom = size ? size / Math.max(project.width, project.height) : z;
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const anim = project.animations.find((a) => a.name === animation) ?? project.animations[0]!;
  const [tick, setTick] = useState(0);
  const playing = (play === 'always' || (play === 'hover' && hover)) && anim.frames.length > 1 && !reducedMotion();

  useEffect(() => {
    if (play !== 'hover') return;
    const card = ref.current?.closest('.card');
    if (!card) return;
    const on = () => setHover(true);
    const off = () => { setHover(false); setTick(0); };
    card.addEventListener('pointerenter', on);
    card.addEventListener('pointerleave', off);
    return () => { card.removeEventListener('pointerenter', on); card.removeEventListener('pointerleave', off); };
  }, [play]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000 / anim.fps);
    return () => clearInterval(id);
  }, [playing, anim.fps]);

  const index = playing ? frameAt(anim.holds, tick) : Math.min(play ? 0 : frame, anim.frames.length - 1);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, project.width, project.height);
    anim.frames[index]?.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const entry = project.palette[row[x]!];
        if (!entry) continue; // '.' = transparente
        ctx.fillStyle = entry.color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }, [project, anim, index]);

  return (
    <canvas
      ref={ref}
      className="spr"
      width={project.width}
      height={project.height}
      style={{ width: project.width * zoom, height: project.height * zoom, imageRendering: 'pixelated' }}
    />
  );
}

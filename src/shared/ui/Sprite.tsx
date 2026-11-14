import { useEffect, useRef, useState } from 'react';
import type { Project } from '@api';

type Props = {
  project: Project;
  animation?: string;
  frame?: number;
  zoom?: number;
  /** 'hover' reproduce solo mientras el puntero está sobre el ancestro `.card`. */
  play?: 'always' | 'hover' | false;
};

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Sprite({ project, animation, frame = 0, zoom = 4, play = false }: Props) {
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

  const index = playing ? tick % anim.frames.length : Math.min(play ? 0 : frame, anim.frames.length - 1);

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

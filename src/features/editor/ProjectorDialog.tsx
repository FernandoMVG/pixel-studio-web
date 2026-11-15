import { useEffect, useState, type KeyboardEvent } from 'react';
import type { Animation, Project } from '@api';
import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';
import { frameAt, Sprite } from '../../shared/ui/Sprite.tsx';
import './projector.css';

/** Ancho de un fotograma en la tira (px); igual que `--step` en projector.css. */
const STEP = 76;
/** Fotogramas que se dibujan a cada lado de la lámpara. */
const AROUND = 12;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = { project: Project; anim: Animation; onClose: () => void };

/**
 * Sala de proyección: la animación en grande y, debajo, la tira de película corriendo.
 * La tira avanza un fotograma por tic, así que un cuadro ×3 ocupa tres fotogramas iguales, como en el cine.
 */
export function ProjectorDialog({ project, anim, onClose }: Props) {
  const { holds, fps } = anim;
  const n = anim.frames.length;
  const total = holds.reduce((a, b) => a + b, 0);
  const starts = holds.map((_, i) => holds.slice(0, i).reduce((a, b) => a + b, 0));
  const mod = (t: number) => ((t % total) + total) % total;

  // Tic absoluto: no vuelve a 0 al dar la vuelta, así la tira nunca rebobina de golpe.
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPos((p) => p + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [playing, fps]);

  const frame = frameAt(holds, mod(pos));

  /** Salta al inicio del cuadro anterior o siguiente (no al tic), y pausa. */
  const jump = (d: 1 | -1) => {
    setPlaying(false);
    setPos((p) => {
      const g = frameAt(holds, mod(p)) + d;
      return (Math.floor(p / total) + Math.floor(g / n)) * total + starts[((g % n) + n) % n]!;
    });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); setPlaying((x) => !x); }
    else if (e.key === 'ArrowRight' || e.key === '.') { e.preventDefault(); jump(1); }
    else if (e.key === 'ArrowLeft' || e.key === ',') { e.preventDefault(); jump(-1); }
  };

  const size = Math.max(160, Math.min(384, innerHeight - 440));
  const ticks = Array.from({ length: AROUND * 2 + 1 }, (_, i) => pos - AROUND + i);
  const seconds = (total / fps).toLocaleString('es', { maximumFractionDigits: 1 });

  return (
    <Dialog labelledBy="cine-t" onClose={onClose} className="dlg-cine">
      <div onKeyDown={onKey}>
        <div className="dlg-head">
          <h2 id="cine-t">{project.name} <span className="cine-sub">animación '{anim.name}'</span></h2>
          <button className="icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="cine-screen">
          <div className="cine-frame">
            <Sprite project={project} animation={anim.name} frame={frame} size={size} />
          </div>
        </div>

        <div className="reel-wrap" aria-hidden="true">
          <ol className="reel" style={{ translate: `${-pos * STEP}px 0` }}>
            {ticks.map((k) => (
              <li key={k} className={k === pos ? 'on' : undefined} style={{ left: k * STEP }}>
                <span className="fc"><Sprite project={project} animation={anim.name} frame={frameAt(holds, mod(k))} size={48} /></span>
              </li>
            ))}
          </ol>
          <div className="gate" />
        </div>

        <div className="cine-ctl">
          <button className="icon-btn prev" type="button" aria-label="Cuadro anterior" data-tip="Anterior (←)" disabled={n < 2} onClick={() => jump(-1)}><Icon name="chev" /></button>
          <button className="btn btn-primary px" type="button" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            <Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pausar' : 'Reproducir'}
          </button>
          <button className="icon-btn" type="button" aria-label="Cuadro siguiente" data-tip="Siguiente (→)" disabled={n < 2} onClick={() => jump(1)}><Icon name="chev" /></button>
          <output className="cine-count num">
            Cuadro {frame + 1} de {n}{holds[frame]! > 1 && <b> ×{holds[frame]}</b>}
          </output>
          <span className="cine-meta"><span className="num">{fps}</span> cuadros/s, total <span className="num">{seconds} s</span></span>
        </div>
      </div>
    </Dialog>
  );
}

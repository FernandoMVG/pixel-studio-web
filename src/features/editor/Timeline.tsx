import type { Animation, Project } from '@api';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Sprite } from '../../shared/ui/Sprite.tsx';
import type { Send } from './types.ts';

type Props = {
  project: Project;
  anim: Animation;
  frame: number;
  playing: boolean;
  onAnim: (name: string) => void;
  onFrame: (i: number) => void;
  onPlay: () => void;
  onNewAnimation: () => void;
  onSend: Send;
};

export function Timeline({ project, anim, frame, playing, onAnim, onFrame, onPlay, onNewAnimation, onSend }: Props) {
  const n = anim.frames.length;

  /** Envía un cambio de cuadros y, si salió bien, selecciona el cuadro indicado. */
  const run = async (cmd: Parameters<Send>[0][number], select: number) => {
    if (!(await onSend([cmd]))) onFrame(select);
  };

  const commitFps = (input: HTMLInputElement) => {
    const v = Math.min(24, Math.max(1, Math.round(Number(input.value)) || anim.fps));
    input.value = String(v);
    if (v !== anim.fps) void onSend([{ type: 'setFps', animation: anim.name, fps: v }]);
  };

  return (
    <footer className="timeline">
      <div className="tl-head">
        <div className="tabs" role="tablist" aria-label="Animaciones">
          {project.animations.map((a) => (
            <button key={a.name} className="tab" role="tab" type="button" aria-selected={a.name === anim.name} onClick={() => onAnim(a.name)}>
              {a.name}<span className="count">{a.frames.length}</span>
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" type="button" onClick={onNewAnimation}><Icon name="plus" small />Animación</button>
        </div>
        <div className="tl-ctl">
          <button className="btn btn-sm" type="button" aria-pressed={playing} data-tip="Espacio" onClick={onPlay}>
            <Icon name={playing ? 'pause' : 'play'} small />{playing ? 'Pausar' : 'Reproducir'}
          </button>
          <label className="fps">
            Velocidad
            <input
              key={`${anim.name}:${anim.fps}`}
              className="input num"
              type="number"
              min={1}
              max={24}
              defaultValue={anim.fps}
              onBlur={(e) => commitFps(e.currentTarget)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            cuadros/s
          </label>
        </div>
      </div>
      <ol className="strip" aria-label={`Cuadros de ${anim.name}`}>
        {anim.frames.map((_, i) => (
          <li key={i} style={{ display: 'flex' }}>
            <button className="frame" type="button" aria-current={i === frame} aria-label={`Cuadro ${i + 1}`} onClick={() => onFrame(i)}>
              <span className="fc"><Sprite project={project} animation={anim.name} frame={i} zoom={3} /></span>
              <span className="num">{i + 1}</span>
            </button>
            {i === frame && (
              <span className="frame-acts">
                <button className="icon-btn" type="button" aria-label="Duplicar cuadro" data-tip="Duplicar cuadro" onClick={() => run({ type: 'addFrame', animation: anim.name, copyOf: i, at: i + 1 }, i + 1)}><Icon name="copy" small /></button>
                <button className="icon-btn" type="button" aria-label="Borrar cuadro" data-tip="Borrar cuadro" disabled={n < 2} onClick={() => run({ type: 'deleteFrame', animation: anim.name, frame: i }, Math.min(i, n - 2))}><Icon name="trash" small /></button>
              </span>
            )}
          </li>
        ))}
        <li>
          <button className="frame-add" type="button" aria-label="Añadir cuadro vacío" data-tip="Añadir cuadro" onClick={() => run({ type: 'addFrame', animation: anim.name }, n)}><Icon name="plus" /></button>
        </li>
      </ol>
    </footer>
  );
}

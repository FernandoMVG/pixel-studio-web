import type { Project } from '@api';
import { Sprite } from '../../shared/ui/Sprite.tsx';

type Props = { project: Project; animation: string; frame: number; playing: boolean };

export function PreviewPanel({ project, animation, frame, playing }: Props) {
  return (
    <section className="panel">
      <div className="panel-h"><h2>Vista previa</h2><span className="hint">tamaño real</span></div>
      <div className="prev-row">
        {/* Tamaños reales enteros; con lienzos grandes, 4× no cabe en el panel. */}
        {(Math.max(project.width, project.height) > 16 ? [1, 2, 3] : [1, 2, 4]).map((z) => (
          <figure key={z}>
            <Sprite project={project} animation={animation} frame={frame} zoom={z} play={playing ? 'always' : false} />
            <figcaption>{z}×</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

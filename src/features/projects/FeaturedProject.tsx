import type { Project } from '@api';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Sprite } from '../../shared/ui/Sprite.tsx';

export function FeaturedProject({ project }: { project: Project }) {
  const n = project.animations.length;
  return (
    <section className="feature" aria-labelledby="ft">
      <div className="cart-wrap">
        <div className="cart px">
          <div className="win px">
            <Sprite project={project} zoom={12} play="always" />
          </div>
          <span className="lab">{project.name}</span>
        </div>
      </div>
      <div>
        <p className="muted">Seguir donde lo dejaste</p>
        <h2 id="ft">{project.name}</h2>
        <div className="feature-meta">
          <span><b className="num">{project.width} × {project.height}</b>píxeles</span>
          <span><b className="num">{n}</b>{n === 1 ? 'animación' : 'animaciones'}</span>
          <span><b className="num">{Object.keys(project.palette).length}</b>colores</span>
        </div>
        <div className="row">
          <a className="btn btn-primary px" href={`#/editor/${project.id}`}><Icon name="pencil" />Abrir en el editor</a>
          <a className="btn" href={`#/exportar/${project.id}`}><Icon name="export" />Exportar</a>
        </div>
      </div>
    </section>
  );
}

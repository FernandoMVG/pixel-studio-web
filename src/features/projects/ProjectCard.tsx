import { useRef } from 'react';
import type { Project } from '@api';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Sprite } from '../../shared/ui/Sprite.tsx';
import { PaletteStrip } from './PaletteStrip.tsx';

export const animationsLabel = (p: Project) => `${p.animations.length} ${p.animations.length === 1 ? 'animación' : 'animaciones'}`;

export function ProjectCard({ project, onDelete }: { project: Project; onDelete: (p: Project) => void }) {
  const menuId = `m-${project.id}`;
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // El popover vive en la capa superior: se coloca bajo su botón al abrir, o encima si no cabe en la ventana.
  const place = (e: React.ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== 'open') return;
    const b = button.current!.getBoundingClientRect();
    const m = menu.current!;
    const below = b.bottom + 4;
    const fits = below + m.offsetHeight <= innerHeight - 8;
    m.style.top = `${fits ? below : Math.max(8, b.top - 4 - m.offsetHeight)}px`;
    m.style.left = `${Math.max(8, b.right - m.offsetWidth)}px`;
  };

  return (
    <li className="card">
      <a className="card-hit" href={`#/editor/${project.id}`} aria-label={`Abrir ${project.name}`} />
      <div className="thumb px">
        <Sprite project={project} size={96} play="hover" />
      </div>
      <div className="card-body">
        <h3>{project.name}</h3>
        <div className="card-meta">
          <span>{animationsLabel(project)}</span>
          <span className="num">{project.width} × {project.height}</span>
        </div>
      </div>
      <div className="card-foot">
        <PaletteStrip palette={project.palette} />
        <button ref={button} className="icon-btn card-more" type="button" popoverTarget={menuId} aria-label={`Más acciones para ${project.name}`}>
          <Icon name="more" />
        </button>
      </div>
      <div className="menu" popover="auto" id={menuId} ref={menu} onToggle={place}>
        <a href={`#/editor/${project.id}`}><Icon name="pencil" small />Abrir</a>
        <a href={`#/exportar/${project.id}`}><Icon name="export" small />Exportar</a>
        <hr />
        <button className="danger" type="button" popoverTarget={menuId} popoverTargetAction="hide" onClick={() => onDelete(project)}>
          <Icon name="trash" small />Borrar…
        </button>
      </div>
    </li>
  );
}

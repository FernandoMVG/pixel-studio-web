import { Icon } from '../../shared/ui/Icons.tsx';
import { TOOLS, type Tool } from './tools.ts';

type Props = { tool: Tool; onTool: (t: Tool) => void; onMirror: () => void };

export function Tools({ tool, onTool, onMirror }: Props) {
  return (
    <div className="tools" role="toolbar" aria-orientation="vertical" aria-label="Herramientas">
      {TOOLS.map((t) => (
        <button key={t.id} className="icon-btn" type="button" aria-pressed={tool === t.id} aria-label={t.label} data-tip={`${t.label} (${t.key})`} data-tip-pos="right" onClick={() => onTool(t.id)}>
          <Icon name={t.icon} />
        </button>
      ))}
      <hr />
      <button className="icon-btn" type="button" aria-label="Espejo horizontal" data-tip="Espejo horizontal (H)" data-tip-pos="right" onClick={onMirror}>
        <Icon name="flip" />
      </button>
    </div>
  );
}

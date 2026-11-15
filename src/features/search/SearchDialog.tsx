import { useEffect, useRef, useState } from 'react';
import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';
import { getLastProject, navigate } from '../../shared/router.ts';
import { useProjects } from '../../shared/useProjects.ts';
import './search.css';

type Item = { group: string; icon: string; label: string; hash: string };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [state] = useProjects();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const projects = state.status === 'ready' ? state.projects : [];
  const current = getLastProject() ?? projects[0]?.id;
  const all: Item[] = [
    { group: 'Acciones', icon: 'home', label: 'Ir a proyectos', hash: '#/proyectos' },
    { group: 'Acciones', icon: 'agent', label: 'Agente', hash: '#/agente' },
    { group: 'Acciones', icon: 'sliders', label: 'Ajustes', hash: '#/ajustes' },
    ...(current ? [{ group: 'Acciones', icon: 'export', label: 'Exportar proyecto actual', hash: `#/exportar/${current}` }] : []),
    ...projects.map((p) => ({ group: 'Proyectos', icon: 'pencil', label: p.name, hash: `#/editor/${p.id}` })),
  ];
  const q = norm(query.trim());
  const items = all.filter((i) => norm(i.label).includes(q));
  const active = Math.min(sel, items.length - 1);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const open = (i: Item | undefined) => {
    if (!i) return;
    onClose();
    navigate(i.hash);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(items.length ? (active + 1) % items.length : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(items.length ? (active - 1 + items.length) % items.length : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); open(items[active]); }
  };

  return (
    <Dialog labelledBy="cmd-title" onClose={onClose} className="cmd">
      <div style={{ padding: 10 }}>
        <h2 id="cmd-title" className="sr">Buscar y ejecutar</h2>
        <div className="with-icon">
          <Icon name="search" />
          <input
            className="input" autoFocus placeholder="Busca un proyecto o una acción" aria-label="Buscar"
            role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={items[active] ? `cmd-${active}` : undefined}
            style={{ height: 48, fontSize: 15 }} value={query} onKeyDown={onKey}
            onChange={(e) => { setQuery(e.target.value); setSel(0); }}
          />
        </div>
      </div>
      <div className="cmd-list" id="cmd-list" role="listbox" ref={listRef}>
        {items.length === 0 && <p className="hint" style={{ padding: 10 }}>Nada coincide con «{query.trim()}».</p>}
        {items.map((it, i) => (
          <div key={it.group + it.hash + it.label}>
            {(i === 0 || items[i - 1]!.group !== it.group) && <p className="hint" style={{ padding: '10px 10px 4px' }}>{it.group}</p>}
            <div className="menu">
              <a id={`cmd-${i}`} role="option" aria-selected={i === active} href={it.hash} tabIndex={-1}
                onClick={(e) => { e.preventDefault(); open(it); }} onMouseMove={() => setSel(i)}>
                <Icon name={it.icon} small />{it.label}
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="dlg-foot" style={{ justifyContent: 'flex-start', fontSize: 12, color: 'var(--ink-3)' }}>
        <span className="row"><kbd>↑</kbd><kbd>↓</kbd>moverse</span>
        <span className="row"><kbd>Enter</kbd>abrir</span>
        <span className="row"><kbd>Esc</kbd>cerrar</span>
      </div>
    </Dialog>
  );
}

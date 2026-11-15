import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@api';
import { api, ApiOfflineError } from '../../infra/api.ts';
import { subscribe } from '../../infra/live.ts';
import { getLastProject } from '../../shared/router.ts';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Offline } from '../../shared/ui/Offline.tsx';
import { DeleteProjectDialog } from './DeleteProjectDialog.tsx';
import { FeaturedProject } from './FeaturedProject.tsx';
import { NewProjectDialog } from './NewProjectDialog.tsx';
import { ProjectCard } from './ProjectCard.tsx';
import './projects.css';

type State = { status: 'loading' } | { status: 'offline' } | { status: 'error'; message: string } | { status: 'ready'; projects: Project[] };

function Skeleton() {
  return (
    <>
      <div className="feature">
        <div className="sk" style={{ height: 260, borderRadius: 0 }} />
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="sk sk-line" style={{ width: '30%' }} />
          <div className="sk" style={{ height: 40, width: '50%' }} />
          <div className="sk sk-line" style={{ width: '70%' }} />
          <div className="sk sk-line" style={{ width: '55%' }} />
          <div className="row" style={{ marginTop: 12 }}>
            <div className="sk" style={{ width: 170, height: 40 }} />
            <div className="sk" style={{ width: 110, height: 40 }} />
          </div>
        </div>
      </div>
      <ul className="cards">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="card">
            <div className="sk" style={{ aspectRatio: '4/3' }} />
            <div className="card-body">
              <div className="sk sk-line" style={{ width: '60%' }} />
              <div className="sk sk-line" style={{ width: '40%', marginTop: 6 }} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty" style={{ marginTop: 24 }}>
      <div className="cart-wrap" style={{ rotate: '3deg', filter: 'none' }}>
        <div className="thumb px" style={{ width: 180, ['--s' as string]: '5px', boxShadow: 'inset 0 0 0 2px var(--line)' }}><Icon name="plus" /></div>
      </div>
      <h2>Tu mesa de luz está vacía</h2>
      <p>Crea un personaje desde cero o conecta un agente para que dibuje uno contigo. Cada proyecto se guarda como un archivo .json en tu carpeta.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary px" type="button" onClick={onNew}><Icon name="plus" />Nuevo proyecto</button>
        <a className="btn" href="#/agente"><Icon name="agent" />Conectar un agente</a>
      </div>
    </div>
  );
}

export function ProjectsScreen() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    api.listProjects().then(
      (projects) => setState({ status: 'ready', projects }),
      (e) => setState(e instanceof ApiOfflineError ? { status: 'offline' } : { status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
  }, []);
  useEffect(load, [load]);

  // En vivo: lo que crea, borra o dibuja otra sesión (el agente) aparece sin recargar. Se pide la lista como mucho cada 500 ms.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasClosed = false;
    const refresh = () => {
      timer ??= setTimeout(() => {
        timer = undefined;
        api.listProjects().then((projects) => setState({ status: 'ready', projects }), () => {});
      }, 500);
    };
    const off = subscribe('*', refresh, (s) => {
      if (s === 'closed') wasClosed = true;
      else if (s === 'open' && wasClosed) { wasClosed = false; refresh(); }
    });
    return () => { off(); clearTimeout(timer); };
  }, []);

  if (state.status === 'offline') return <Offline onRetry={load} />;

  const projects = state.status === 'ready' ? state.projects : [];
  const empty = state.status === 'ready' && projects.length === 0;
  const featured = projects.find((p) => p.id === getLastProject()) ?? projects[0];
  const shown = projects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const total = `${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'}`;

  return (
    <div className="page" aria-busy={state.status === 'loading'}>
      <header className="gal-head">
        <div>
          <h1 className="display" tabIndex={-1}>Tus personajes</h1>
          <p className="lede">
            {state.status === 'loading' ? <span className="sk sk-line" style={{ display: 'inline-block', width: 220 }} />
              : state.status === 'error' ? 'No se pudieron cargar los proyectos'
              : empty ? 'Aún no hay proyectos' : total}
          </p>
        </div>
        <div className="gal-tools">
          {state.status === 'ready' && !empty && (
            <div className="with-icon">
              <Icon name="search" />
              <input className="input" type="search" placeholder="Buscar por nombre" aria-label="Buscar proyectos" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          )}
          <button className="btn btn-primary px" type="button" onClick={() => setCreating(true)}><Icon name="plus" />Nuevo proyecto</button>
        </div>
      </header>

      {state.status === 'loading' && <Skeleton />}
      {state.status === 'error' && (
        <div className="empty"><p>{state.message}</p><button className="btn" type="button" onClick={load}><Icon name="refresh" />Reintentar</button></div>
      )}
      {empty && <EmptyState onNew={() => setCreating(true)} />}
      {state.status === 'ready' && !empty && (
        <>
          {featured && <FeaturedProject project={featured} />}
          <div className="sec-h"><h2>Todos los proyectos</h2><span className="faint num">{projects.length}</span></div>
          <ul className="cards">
            <li className="card card-new">
              <a href="#/proyectos" aria-label="Nuevo proyecto" onClick={(e) => { e.preventDefault(); setCreating(true); }} />
              <div>
                <span className="plus px"><Icon name="plus" /></span>
                <b>Nuevo proyecto</b>
                <span className="hint">16 × 16, paleta de hasta 6 colores</span>
              </div>
            </li>
            {shown.map((p) => <ProjectCard key={p.id} project={p} onDelete={setDeleting} />)}
          </ul>
          {shown.length === 0 && <p className="muted" style={{ marginTop: 16 }}>Ningún proyecto se llama «{query.trim()}».</p>}
        </>
      )}

      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
      {deleting && <DeleteProjectDialog project={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); load(); }} />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { Project } from '@api';
import { api } from './infra/api.ts';
import { getLastProject, setLastProject, useRoute } from './shared/router.ts';
import { IconSprite, Icon } from './shared/ui/Icons.tsx';
import { Sprite } from './shared/ui/Sprite.tsx';
import { ToastProvider } from './shared/ui/toast.tsx';
import { ProjectsScreen } from './features/projects/ProjectsScreen.tsx';
import { EditorScreen } from './features/editor/EditorScreen.tsx';
import { AgentScreen } from './features/agent/AgentScreen.tsx';
import { ExportScreen } from './features/export/ExportScreen.tsx';
import { SearchDialog } from './features/search/SearchDialog.tsx';
import { SettingsScreen } from './features/settings/SettingsScreen.tsx';

function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('ps-theme', next);
  } catch {
    /* sin almacenamiento */
  }
}

function Brand({ id }: { id: string | null }) {
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    setProject(null);
    if (id) api.getProject(id).then(setProject, () => {});
  }, [id]);
  return (
    <a className="brand" href="#/proyectos" aria-label="Pixel Studio, ir a proyectos">
      {project ? <Sprite project={project} size={40} play="always" /> : <Icon name="palette" />}
    </a>
  );
}

function Rail({ page, last }: { page: string; last: string | null }) {
  const link = (key: string, href: string, icon: string, label: string) => (
    <a className="nav" href={href} aria-current={page === key ? 'page' : undefined}>
      <Icon name={icon} />{label}
    </a>
  );
  return (
    <nav className="rail" aria-label="Principal">
      <Brand id={last} />
      {link('proyectos', '#/proyectos', 'home', 'Proyectos')}
      {link('editor', last ? `#/editor/${last}` : '#/proyectos', 'pencil', 'Editor')}
      {link('agente', '#/agente', 'agent', 'Agente')}
      {link('exportar', last ? `#/exportar/${last}` : '#/proyectos', 'export', 'Exportar')}
      <div className="spacer" />
      {link('ajustes', '#/ajustes', 'sliders', 'Ajustes')}
      <button className="nav" type="button" onClick={toggleTheme} data-tip="Cambiar tema" data-tip-pos="right">
        <svg className="i t-moon"><use href="#i-moon" /></svg>
        <svg className="i t-sun"><use href="#i-sun" /></svg>
        Tema
      </button>
    </nav>
  );
}

export default function App() {
  const { path } = useRoute();
  const [page, id] = path as [string, string | undefined];
  const editing = page === 'editor' && id ? id : null;
  useEffect(() => {
    if (editing) setLastProject(editing);
  }, [editing]);
  const last = editing ?? getLastProject();
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) return;
      const t = e.target as HTMLElement;
      if (t.matches?.('input, textarea, select, [contenteditable]') && !t.closest('dialog.cmd')) return;
      e.preventDefault();
      setSearching((s) => !s);
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
  // `#/editor` sin proyecto muestra la galería: el riel debe decir lo mismo.
  const active = page === 'editor' && !id ? 'proyectos' : page;

  return (
    <ToastProvider>
      <IconSprite />
      <div className="app">
        <Rail page={active} last={last} />
        <main>
          {page === 'editor' && id ? <EditorScreen key={id} projectId={id} />
            : page === 'agente' ? <AgentScreen />
            : page === 'exportar' ? <ExportScreen />
            : page === 'ajustes' ? <SettingsScreen />
            : <ProjectsScreen />}
        </main>
      </div>
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </ToastProvider>
  );
}

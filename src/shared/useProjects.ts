import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@api';
import { api, ApiOfflineError } from '../infra/api.ts';

export type ProjectsState = { status: 'loading' } | { status: 'offline' } | { status: 'error'; message: string } | { status: 'ready'; projects: Project[] };

/** Lista de proyectos con estados de carga, error y sin conexión. */
export function useProjects(): [ProjectsState, () => void] {
  const [state, setState] = useState<ProjectsState>({ status: 'loading' });
  const load = useCallback(() => {
    api.listProjects().then(
      (projects) => setState({ status: 'ready', projects }),
      (e) => setState(e instanceof ApiOfflineError ? { status: 'offline' } : { status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
  }, []);
  useEffect(load, [load]);
  return [state, load];
}

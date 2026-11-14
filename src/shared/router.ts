import { useEffect, useState } from 'react';

const ROUTES = ['proyectos', 'editor', 'agente', 'exportar', 'ajustes'];
const LAST_KEY = 'ps-last-project';

const parse = () => {
  const path = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return ROUTES.includes(path[0] ?? '') ? path : ['proyectos'];
};

export function navigate(hash: string) {
  location.hash = hash;
}

export function getLastProject(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function setLastProject(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* sin almacenamiento: se ignora */
  }
}

export function useRoute(): { path: string[] } {
  const [path, setPath] = useState(parse);
  useEffect(() => {
    const on = () => {
      setPath(parse());
      // al cambiar de vista, el foco va a su h1
      requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1')?.focus());
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return { path };
}

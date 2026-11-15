import { useEffect, useState } from 'react';
import { Icon } from '../../shared/ui/Icons.tsx';
import { ShortcutsDialog } from '../editor/ShortcutsDialog.tsx';
import './settings.css';

type Theme = '' | 'light' | 'dark';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('ps-theme');
    return t === 'light' || t === 'dark' ? t : '';
  } catch {
    return '';
  }
}

function useSystemDark() {
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return dark;
}

export function SettingsScreen() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [shortcuts, setShortcuts] = useState(false);
  const systemDark = useSystemDark();

  const choose = (t: Theme) => {
    setTheme(t);
    try {
      if (t) localStorage.setItem('ps-theme', t);
      else localStorage.removeItem('ps-theme');
    } catch {
      /* sin almacenamiento */
    }
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  };

  const opt = (value: Theme, content: React.ReactNode) => (
    <label><input type="radio" name="theme" value={value} checked={theme === value} onChange={() => choose(value)} />{content}</label>
  );

  return (
    <div className="page prefs">
      <header>
        <h1 className="display" tabIndex={-1}>Ajustes</h1>
        <p className="muted">Lo que puedes cambiar desde el editor.</p>
      </header>
      <section>
        <h2>Apariencia</h2>
        <div className="set-list">
          <div className="set">
            <div><b>Tema</b><p>Sigue al sistema hasta que elijas otro.</p></div>
            <div className="seg" role="radiogroup" aria-label="Tema">
              {opt('', `Sistema (ahora ${systemDark ? 'oscuro' : 'claro'})`)}
              {opt('light', <><Icon name="sun" small />Claro</>)}
              {opt('dark', <><Icon name="moon" small />Oscuro</>)}
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2>Agente</h2>
        <div className="set-list">
          <div className="set">
            <div><b>Permisos del agente</b><p>Decide si puede crear o borrar proyectos.</p></div>
            <a className="btn" href="#/agente"><Icon name="agent" />Abrir Agente</a>
          </div>
        </div>
      </section>
      <section>
        <h2>Teclado</h2>
        <div className="set-list">
          <div className="set">
            <div><b>Atajos de teclado</b><p>Las teclas de herramientas son de una letra, como en la mayoría de editores de píxeles.</p></div>
            <button className="btn" type="button" onClick={() => setShortcuts(true)}><Icon name="keyboard" />Ver atajos</button>
          </div>
        </div>
      </section>
      <section>
        <h2>Datos</h2>
        <div className="set-list">
          <div className="set">
            <div>
              <b>Dónde se guardan tus proyectos</b>
              <p>En la carpeta configurada en pixel-api (por defecto <span className="mono">~/PixelStudio/proyectos</span>). Se cambia con <span className="mono">PIXEL_PROJECTS_DIR</span> en <span className="mono">pixel-api/.env</span>.</p>
            </div>
          </div>
        </div>
      </section>
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { ActivityEntry, Project, Settings } from '@api';
import { api, API_URL, ApiOfflineError } from '../../infra/api.ts';
import { getLastProject } from '../../shared/router.ts';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Offline } from '../../shared/ui/Offline.tsx';
import { useToast } from '../../shared/ui/toast.tsx';
import { useProjects } from '../../shared/useProjects.ts';
import './agent.css';

const MCP_URL = `${API_URL}/mcp`;
const ACTIVE_MS = 10 * 60_000;

const SAY: Record<string, string> = {
  set_rows: 'Pintó filas', set_pixels: 'Pintó píxeles', fill: 'Rellenó una zona', get_frame: 'Leyó un cuadro',
  list_projects: 'Miró tus proyectos', get_project: 'Miró un proyecto', create_project: 'Creó un proyecto',
  export_png: 'Revisó la imagen', add_frame: 'Añadió un cuadro', delete_frame: 'Borró un cuadro',
  set_fps: 'Cambió la velocidad', add_animation: 'Creó una animación', rename_animation: 'Renombró una animación',
  delete_animation: 'Borró una animación', delete_project: 'Borró un proyecto', set_palette: 'Cambió la paleta',
  undo: 'Deshizo', redo: 'Rehízo',
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour12: false });

function CopyBlock({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => toast('Copiado'),
      () => toast('Selecciona el texto y cópialo con Ctrl+C'),
    );
  return (
    <pre className="code">
      {text}
      <button className="icon-btn" type="button" aria-label={label} onClick={copy}><Icon name="copy" small /></button>
    </pre>
  );
}

function LogItem({ e }: { e: ActivityEntry }) {
  const cls = !e.ok ? 'err' : e.fixed ? 'fixed' : 'ok';
  return (
    <li className={cls}>
      <time className="num">{time(e.at)}</time>
      <span className="st" role="img" aria-label={cls === 'err' ? 'Error' : cls === 'fixed' ? 'Autocorregido' : 'Correcto'}>
        <Icon name={cls === 'err' ? 'close' : 'check'} small />
      </span>
      <div>
        <b className="say">{SAY[e.tool] ?? e.tool}</b>
        <p>{e.fixed ? `Autocorregido. ${e.message}` : e.message}</p>
        <code>{e.tool}</code>
        {e.args && <span className="args">{e.args}</span>}
      </div>
    </li>
  );
}

function LogSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <div className="sk sk-line" style={{ width: 56 }} />
          <div className="sk" style={{ width: 22, height: 22 }} />
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="sk sk-line" style={{ width: '45%' }} />
            <div className="sk sk-line" style={{ width: '75%' }} />
          </div>
        </li>
      ))}
    </>
  );
}

function Permissions() {
  const toast = useToast();
  const [perms, setPerms] = useState<Settings['agent'] | null>(null);
  useEffect(() => {
    api.getSettings().then((s) => setPerms(s.agent), () => {});
  }, []);
  const change = (key: 'create' | 'delete', value: boolean) => {
    if (!perms) return;
    const before = perms;
    setPerms({ ...perms, [key]: value });
    api.updateAgent({ [key]: value }).then(
      (s) => { setPerms(s.agent); toast('Permisos guardados', 'ok', 'Se aplican en la siguiente acción del agente'); },
      (e) => { setPerms(before); toast('No se pudieron guardar los permisos', 'err', e instanceof Error ? e.message : undefined); },
    );
  };
  return (
    <section className="conn" aria-labelledby="pm">
      <h2 id="pm" className="t">Qué puede hacer</h2>
      <div className="perm">Leer y dibujar <span className="chip"><Icon name="lock" small />Siempre activo</span></div>
      <label className="perm">Crear proyectos
        <input className="switch" type="checkbox" role="switch" disabled={!perms} checked={perms?.create ?? false} onChange={(e) => change('create', e.target.checked)} />
      </label>
      <label className="perm">Borrar proyectos y animaciones
        <input className="switch" type="checkbox" role="switch" disabled={!perms} checked={perms?.delete ?? false} onChange={(e) => change('delete', e.target.checked)} />
      </label>
      <p className="hint">Un proyecto borrado no se puede recuperar.</p>
    </section>
  );
}

function TextView({ project }: { project: Project }) {
  const toast = useToast();
  const frame = project.animations[0]!.frames[0]!;
  const copy = () =>
    navigator.clipboard.writeText(frame.join('\n')).then(
      () => toast('Copiado'),
      () => toast('Selecciona el texto y cópialo con Ctrl+C'),
    );
  return (
    <section className="panel" aria-labelledby="tv" style={{ padding: 12 }}>
      <div className="panel-h" style={{ paddingInline: 0 }}>
        <h2 id="tv">Lo que lee el agente</h2>
        <button className="icon-btn" type="button" aria-label="Copiar texto del cuadro" data-tip="Copiar" onClick={copy}><Icon name="copy" /></button>
      </div>
      <p className="hint" style={{ marginBottom: 10 }}>{project.name}, {project.animations[0]!.name}, cuadro 1. Cada letra es un píxel.</p>
      <pre className="txtgrid">{frame.map((r, i) => <span key={i}><span className="n">{String(i).padStart(2, '0')}</span>{r}{'\n'}</span>)}</pre>
      <div className="legend">
        <div><code>.</code><span className="sw mini clear" />Transparente</div>
        {Object.entries(project.palette).map(([k, { color, name }]) => (
          <div key={k}><code>{k}</code><span className="sw mini" style={{ ['--c' as string]: color }} />{name}<span className="faint mono" style={{ marginLeft: 'auto', fontSize: 12 }}>{color}</span></div>
        ))}
      </div>
    </section>
  );
}

export function AgentScreen() {
  const [activity, setActivity] = useState<{ lastAt: string | null; entries: ActivityEntry[] } | null>(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [projects] = useProjects();

  const load = useCallback(() => {
    api.getActivity().then(
      (a) => { setActivity(a); setOffline(false); setNow(Date.now()); },
      (e) => { if (e instanceof ApiOfflineError) setOffline(true); },
    );
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  if (offline) return <Offline onRetry={load} />;

  const list = projects.status === 'ready' ? projects.projects : [];
  const shown = list.find((p) => p.id === getLastProject()) ?? list[0];
  const minutes = activity?.lastAt ? Math.floor((now - new Date(activity.lastAt).getTime()) / 60_000) : null;
  const active = activity?.lastAt != null && now - new Date(activity.lastAt).getTime() < ACTIVE_MS;
  const errors = activity?.entries.filter((e) => !e.ok).length ?? 0;
  const fixed = activity?.entries.filter((e) => e.fixed).length ?? 0;

  return (
    <div className="page">
      <header className="ag-head">
        <h1 className="display" tabIndex={-1}>Agente</h1>
        <p className="muted">Un agente de IA puede dibujar con las mismas herramientas que tú a través de MCP. Ves cada comando que envía y cada error que corrige.</p>
      </header>
      <div className="ag">
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="conn" aria-labelledby="cn">
            <div className={active ? 'conn-state' : 'conn-state off'}>
              <span className="lamp px" style={{ ['--s' as string]: '2px' }} />
              <div>
                <h2 id="cn" className="t">{active ? 'Agente activo' : 'Sin actividad reciente'}</h2>
                <p className="hint">{active ? (minutes === 0 ? 'Activo hace un momento' : `Activo hace ${minutes} min`) : activity ? 'Ningún comando en los últimos 10 min' : 'Comprobando…'}</p>
              </div>
            </div>
            <dl className="kv"><dt>Dirección</dt><dd>{MCP_URL}</dd></dl>
            {shown && <a className="btn btn-sm btn-ghost" style={{ justifySelf: 'start' }} href={`#/editor/${shown.id}`}><Icon name="eye" small />Verlo dibujar</a>}
          </section>
          <section className="conn" aria-labelledby="co">
            <h2 id="co" className="t">Conectar un agente</h2>
            <div className="field"><span className="lbl-t">Claude Code</span>
              <CopyBlock text={`claude mcp add --transport http pixel-studio ${MCP_URL}`} label="Copiar comando de Claude Code" /></div>
            <div className="field"><span className="lbl-t">Otros clientes MCP</span>
              <CopyBlock text={`{"mcpServers": {"pixel-studio": {"type": "http", "url": "${MCP_URL}"}}}`} label="Copiar configuración MCP" /></div>
          </section>
          <Permissions />
        </div>
        <section className="panel" aria-labelledby="lg" style={{ padding: '8px 16px' }}>
          <div className="panel-h" style={{ paddingInline: 0 }}>
            <h2 id="lg">Actividad</h2>
            {errors > 0 && <span className="chip chip-err"><Icon name="alert" small />{errors} {errors === 1 ? 'error' : 'errores'}, {fixed} {fixed === 1 ? 'corregido' : 'corregidos'}</span>}
          </div>
          {activity && activity.entries.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0' }}>El agente todavía no ha hecho nada desde que arrancó pixel-api.</p>
          ) : (
            <ul className="log" aria-busy={!activity}>
              {activity ? activity.entries.map((e, i) => <LogItem key={`${e.at}-${i}`} e={e} />) : <LogSkeleton />}
            </ul>
          )}
        </section>
        {shown && <TextView project={shown} />}
      </div>
    </div>
  );
}

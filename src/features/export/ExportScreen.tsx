import { useEffect, useState } from 'react';
import type { Project } from '@api';
import { api, API_URL, ApiRequestError, type ExportKind } from '../../infra/api.ts';
import { getLastProject, useRoute } from '../../shared/router.ts';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Offline } from '../../shared/ui/Offline.tsx';
import { useToast } from '../../shared/ui/toast.tsx';
import { useProjects } from '../../shared/useProjects.ts';
import './export.css';

type Fmt = 'png' | 'sheet' | 'gif' | 'txt' | 'json';
const FMTS: [Fmt, string, string, string, boolean?][] = [
  ['png', 'PNG del cuadro', 'Un cuadro suelto, para avatares e iconos', 'image'],
  ['sheet', 'Hoja de sprites', 'Todos los cuadros en una fila, para juegos', 'grid'],
  ['gif', 'GIF animado', 'Para compartir en chats y documentos', 'film'],
  ['txt', 'Texto para agentes', 'Filas de letras más la paleta, para un prompt o tu terminal', 'terminal', true],
  ['json', 'Proyecto .json', 'El archivo fuente completo, con versión', 'braces'],
];
const KIND: Record<Exclude<Fmt, 'json'>, ExportKind> = { png: 'frame.png', sheet: 'sheet.png', gif: 'animation.gif', txt: 'animation.txt' };
const SCALES = [1, 2, 4, 8, 16];
const JSON_LIMIT = 4000;

function Preview({ project, fmt, url }: { project: Project; fmt: Fmt; url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(null);
    if (fmt === 'json') {
      const s = JSON.stringify(project, null, 2);
      setText(s.length > JSON_LIMIT ? `${s.slice(0, JSON_LIMIT)}\n…` : s);
    } else if (fmt === 'txt') {
      const ctl = new AbortController();
      fetch(url, { signal: ctl.signal }).then((r) => r.text()).then(setText, () => {});
      return () => ctl.abort();
    }
  }, [project, fmt, url]);
  return (
    <div className="pv">
      {fmt === 'txt' || fmt === 'json'
        ? <pre className="txtgrid" style={{ letterSpacing: fmt === 'txt' ? '.3em' : 0 }}>{text ?? 'Cargando…'}</pre>
        : <img src={url} alt="Vista previa de la exportación" />}
    </div>
  );
}

function Ready({ project }: { project: Project }) {
  const toast = useToast();
  const [fmt, setFmt] = useState<Fmt>('png');
  const [animName, setAnimName] = useState(project.animations[0]!.name);
  const [frame, setFrame] = useState(0);
  const [scale, setScale] = useState(8);
  const [busy, setBusy] = useState(false);

  const anim = project.animations.find((a) => a.name === animName) ?? project.animations[0]!;
  const isText = fmt === 'txt' || fmt === 'json';
  const f = Math.min(frame, anim.frames.length - 1);

  const name = fmt === 'json' ? `${project.id}.json`
    : fmt === 'txt' ? `${project.id}-${anim.name}.txt`
    : fmt === 'png' ? `${project.id}-${anim.name}-c${f + 1}-${scale}x.png`
    : `${project.id}-${anim.name}-${scale}x.${fmt === 'gif' ? 'gif' : 'png'}`;
  const url = fmt === 'json' ? `${API_URL}/projects/${project.id}`
    : api.exportUrl(project.id, KIND[fmt], { animation: anim.name, frame: fmt === 'png' ? f : undefined, scale: fmt === 'txt' ? undefined : scale });
  const w = project.width * scale, h = project.height * scale;

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { errors?: string[] } | null;
        throw new ApiRequestError(res.status, data?.errors ?? [`Error ${res.status}`]);
      }
      const blobUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast('Exportado', 'ok', name);
    } catch (e) {
      toast('No se pudo exportar', 'err', e instanceof ApiRequestError ? e.messages.join(' ') : 'No se puede conectar con pixel-api');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="ex">
        <div>
          <header>
            <h1 className="display" tabIndex={-1}>Exportar</h1>
            <p className="muted">{project.name}. El escalado es siempre por vecino más cercano: cada píxel se convierte en un bloque exacto, sin desenfoque.</p>
          </header>
          <fieldset className="fmts" style={{ border: 0, padding: 0 }}>
            <legend className="sr">Formato</legend>
            {FMTS.map(([id, n, d, icon, tag]) => (
              <label className="fmt" key={id}>
                <input type="radio" name="fmt" value={id} checked={fmt === id} onChange={() => setFmt(id)} />
                <span className="ic"><Icon name={icon} /></span>
                <span><b>{n}</b><span>{d}</span></span>
                {tag && <span className="tag">Agentes</span>}
              </label>
            ))}
          </fieldset>
          <div className="opts">
            <div className="field">
              <label htmlFor="exAnim">Animación</label>
              <select className="input" id="exAnim" disabled={fmt === 'json'} value={anim.name} onChange={(e) => setAnimName(e.target.value)}>
                {project.animations.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.frames.length} {a.frames.length === 1 ? 'cuadro' : 'cuadros'})</option>)}
              </select>
            </div>
            {fmt === 'png' && (
              <div className="field">
                <label htmlFor="exFrame">Cuadro</label>
                <select className="input" id="exFrame" value={f} onChange={(e) => setFrame(Number(e.target.value))}>
                  {anim.frames.map((_, i) => <option key={i} value={i}>Cuadro {i + 1}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <span className="lbl-t" id="scl">Escala</span>
              <div className="seg" role="group" aria-labelledby="scl">
                {SCALES.map((s) => <button key={s} type="button" aria-pressed={scale === s} disabled={isText} onClick={() => setScale(s)}>{s}×</button>)}
              </div>
              <span className="hint num">{isText ? 'Los formatos de texto no se escalan.' : `Cada cuadro mide ${w} × ${h} px`}</span>
            </div>
          </div>
        </div>
        <section className="preview" aria-label="Vista previa">
          <Preview project={project} fmt={fmt} url={url} />
          <div className="out-line">
            <span><span className="hint">Archivo</span><br /><span className="mono">{name}</span></span>
            <button className="btn btn-primary px" type="button" onClick={download} disabled={busy}><Icon name="export" />Exportar</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function ExportScreen() {
  const { path } = useRoute();
  const routeId = path[1];
  const [state, reload] = useProjects();

  if (state.status === 'offline') return <Offline onRetry={reload} />;
  if (state.status === 'loading' || state.status === 'error') {
    return (
      <div className="page">
        <h1 className="display" tabIndex={-1}>Exportar</h1>
        {state.status === 'loading'
          ? <div className="sk" style={{ height: 320, marginTop: 24 }} />
          : <p className="muted">{state.message}</p>}
      </div>
    );
  }
  const projects = state.projects;
  const project = routeId ? projects.find((p) => p.id === routeId) : (projects.find((p) => p.id === getLastProject()) ?? projects[0]);
  if (!project) {
    return (
      <div className="page">
        <h1 className="display" tabIndex={-1}>Exportar</h1>
        <div className="empty">
          <p>{routeId ? `No existe un proyecto «${routeId}».` : 'Aún no hay proyectos para exportar.'}</p>
          <a className="btn" href="#/proyectos"><Icon name="home" />Ir a la galería</a>
        </div>
      </div>
    );
  }
  return <Ready key={project.id} project={project} />;
}

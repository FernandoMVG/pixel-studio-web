import { useCallback, useEffect, useRef, useState } from 'react';
import type { Command, Palette, Patch, Project } from '@api';
import { api, ApiOfflineError, ApiRequestError, SESSION_ID } from '../../infra/api.ts';
import { subscribe } from '../../infra/live.ts';
import { setLastProject } from '../../shared/router.ts';
import { Icon } from '../../shared/ui/Icons.tsx';
import { Offline } from '../../shared/ui/Offline.tsx';
import { useToast } from '../../shared/ui/toast.tsx';
import { describePatches } from './history.ts';
import { HistoryPanel } from './HistoryPanel.tsx';
import { NewAnimationDialog } from './NewAnimationDialog.tsx';
import { PaletteDialog } from './PaletteDialog.tsx';
import { PalettePanel } from './PalettePanel.tsx';
import { applyPatch } from './patches.ts';
import { PreviewPanel } from './PreviewPanel.tsx';
import { ShortcutsDialog } from './ShortcutsDialog.tsx';
import { Stage } from './Stage.tsx';
import { Timeline } from './Timeline.tsx';
import { moveCells, shiftRect, TOOLS, type Rect, type Tool } from './tools.ts';
import { Tools } from './Tools.tsx';
import type { Author, Cell, HistoryEntry, Send } from './types.ts';
import './editor.css';

type Load = { status: 'loading' } | { status: 'offline' } | { status: 'missing' } | { status: 'error'; message: string } | { status: 'ready' };
type Dlg = 'palette' | 'shortcuts' | 'animation' | null;

const AGENT = 'agente';
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function Skeleton() {
  return (
    <section className="ed" aria-busy="true">
      <header className="ed-top"><div className="sk sk-line" style={{ width: 220 }} /></header>
      <div className="ed-body">
        <div className="tools"><div className="sk" style={{ width: 40, height: 260 }} /></div>
        <div className="stage"><div className="stage-scroll"><div className="sk" style={{ width: 448, height: 448 }} /></div></div>
        <aside className="side">
          {[120, 110, 180].map((h) => <div key={h} className="sk" style={{ height: h }} />)}
        </aside>
      </div>
      <footer className="timeline"><div className="sk" style={{ height: 120 }} /></footer>
    </section>
  );
}

export function EditorScreen({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [project, setProject] = useState<Project | null>(null);
  const [animName, setAnimName] = useState('');
  const [frame, setFrame] = useState(0);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('.');
  const [zoom, setZoom] = useState(16);
  const [grid, setGrid] = useState(true);
  const [onion, setOnion] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dialog, setDialog] = useState<Dlg>(null);
  const [pending, setPending] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [hist, setHist] = useState<HistoryEntry[]>([]);
  const [agent, setAgent] = useState<{ frame: number } | null>(null);
  const [flash, setFlash] = useState<Cell[]>([]);
  const [sel, setSel] = useState<Rect | null>(null);
  const histId = useRef(0);
  const agentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const first = useRef(true);

  const fetchProject = useCallback(() => {
    api.getProject(projectId).then(
      (p) => {
        setProject(p);
        setLoad({ status: 'ready' });
        if (first.current) {
          first.current = false;
          setZoom(clamp(Math.min(28, Math.floor(480 / Math.max(p.width, p.height))), 8, 40));
          setColor(Object.keys(p.palette)[0] ?? '.');
        }
      },
      (e) => setLoad(e instanceof ApiOfflineError ? { status: 'offline' } : e instanceof ApiRequestError && e.status === 404 ? { status: 'missing' } : { status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
  }, [projectId]);

  const reload = useCallback(() => {
    setLoad({ status: 'loading' });
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    setLastProject(projectId);
    fetchProject();
  }, [projectId, fetchProject]);

  const log = useCallback((by: Author, text: string | null) => {
    if (text) setHist((h) => [{ id: histId.current++, by, text }, ...h].slice(0, 30));
  }, []);

  /** Aplica al proyecto confirmado los parches que ya guardó el servidor. */
  const confirm = useCallback((patches: Patch[], by: Author, text = describePatches(patches)) => {
    if (!patches.length) return;
    setProject((p) => p && patches.reduce(applyPatch, p));
    log(by, text);
  }, [log]);

  useEffect(() => {
    let wasClosed = false;
    const off = subscribe(
      projectId,
      (m) => {
        if (m.sessionId === SESSION_ID) return; // ya se aplicó con la respuesta HTTP
        const by: Author = m.sessionId === AGENT ? 'agente' : 'otra';
        confirm(m.patches, by);
        if (by !== 'agente') return;
        const last = [...m.patches].reverse().find((p) => p.kind === 'pixels');
        setAgent({ frame: last?.kind === 'pixels' ? last.frame : 0 });
        clearTimeout(agentTimer.current);
        agentTimer.current = setTimeout(() => setAgent(null), 4000);
        if (last?.kind === 'pixels') {
          setFlash(last.changes.map((c) => ({ x: c.x, y: c.y, color: c.after })));
          clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash([]), 1000);
        }
      },
      (s) => {
        if (s === 'closed') wasClosed = true;
        else if (s === 'open' && wasClosed) {
          wasClosed = false;
          fetchProject(); // se pudieron perder parches mientras estaba cortado
        }
      },
    );
    return () => {
      off();
      clearTimeout(agentTimer.current);
      clearTimeout(flashTimer.current);
    };
  }, [projectId, confirm, fetchProject]);

  const anim = project ? (project.animations.find((a) => a.name === animName) ?? project.animations[0]) : undefined;
  const frameIdx = anim ? Math.min(frame, anim.frames.length - 1) : 0;
  const palette: Palette = project?.palette ?? {};
  const activeColor = color === '.' || palette[color] ? color : (Object.keys(palette)[0] ?? '.');

  const send: Send = useCallback(async (commands: Command[], opts) => {
    setPending((n) => n + 1);
    try {
      confirm(await api.apply(projectId, commands), 'tu');
      setSaveError(false);
      return null;
    } catch (e) {
      setSaveError(true);
      const messages = e instanceof ApiRequestError ? e.messages : [e instanceof ApiOfflineError ? 'Sin conexión con pixel-api.' : 'Error inesperado.'];
      if (!opts?.quiet) toast('No se pudo aplicar el cambio', 'err', messages.join(' '));
      return messages;
    } finally {
      setPending((n) => n - 1);
    }
  }, [projectId, confirm, toast]);

  const step = async (kind: 'undo' | 'redo') => {
    try {
      const patches = await api[kind](projectId);
      if (!patches.length) return toast(kind === 'undo' ? 'No hay nada que deshacer' : 'No hay nada que rehacer');
      confirm(patches, 'tu', kind === 'undo' ? 'Deshecho' : 'Rehecho');
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
      toast('No se pudo aplicar el cambio', 'err', e instanceof ApiRequestError ? e.messages.join(' ') : 'Sin conexión con pixel-api.');
    }
  };

  const mirror = () => {
    const rows = anim?.frames[frameIdx];
    if (!anim || !rows) return;
    void send([{ type: 'setRows', animation: anim.name, frame: frameIdx, startRow: 0, rows: rows.map((r) => [...r].reverse().join('')) }]);
  };

  /** Flechas: mueve la selección un píxel (Alt copia). Con un envío en curso se ignora, para no calcular sobre filas viejas. */
  const nudge = (dx: number, dy: number, copy: boolean) => {
    const rows = anim?.frames[frameIdx];
    if (!anim || !rows || !sel || pending) return;
    const cells = moveCells(rows, sel, dx, dy, copy);
    setSel(shiftRect(sel, dx, dy, project!.width, project!.height));
    if (cells.length) void send([{ type: 'setPixels', animation: anim.name, frame: frameIdx, pixels: cells }]);
  };
  const clearSel = () => {
    const rows = anim?.frames[frameIdx];
    if (!anim || !rows || !sel) return;
    const pixels: Cell[] = [];
    for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) if (rows[y]![x] !== '.') pixels.push({ x, y, color: '.' });
    if (pixels.length) void send([{ type: 'setPixels', animation: anim.name, frame: frameIdx, pixels }]);
  };

  const setZ = (d: number) => setZoom((z) => clamp(z + d, 8, 40));
  const keys = Object.keys(palette);

  // Atajos: el manejador se registra una vez y lee siempre la última versión.
  const act = useRef<(e: KeyboardEvent) => void>(() => {});
  act.current = (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input,textarea,select,[contenteditable]') || dialog || document.querySelector('dialog[open]') || !anim) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keyup' && k !== ' ') return;
    if (e.ctrlKey || e.metaKey) {
      if (k === 'z') { e.preventDefault(); void step(e.shiftKey ? 'redo' : 'undo'); }
      else if (k === 'y') { e.preventDefault(); void step('redo'); }
      else if (k === 'a') { e.preventDefault(); setTool('select'); setSel({ x0: 0, y0: 0, x1: project!.width - 1, y1: project!.height - 1 }); }
      return;
    }
    if (tool === 'select' && sel) {
      const dir = ({ arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] } as Record<string, [number, number]>)[k];
      if (dir) { e.preventDefault(); return nudge(dir[0], dir[1], e.altKey); }
      if (k === 'escape') return setSel(null);
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); return clearSel(); }
    }
    if (e.altKey) return;
    const hit = TOOLS.find((x) => x.key.toLowerCase() === k);
    if (hit) setTool(hit.id);
    else if (k === 'h') mirror();
    else if (/^[0-6]$/.test(k)) { if (k === '0') setColor('.'); else if (keys[+k - 1]) setColor(keys[+k - 1]!); }
    else if (k === '#') setGrid((g) => !g);
    else if (k === 'o') setOnion((o) => !o);
    else if (k === ' ') { e.preventDefault(); if (e.type === 'keydown' && !e.repeat) setPlaying((p) => !p); }
    else if (k === ',') setFrame(Math.max(0, frameIdx - 1));
    else if (k === '.') setFrame(Math.min(anim.frames.length - 1, frameIdx + 1));
    else if (k === '+' || k === '=') setZ(4);
    else if (k === '-') setZ(-4);
    else if (k === '?') setDialog('shortcuts');
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => act.current(e);
    addEventListener('keydown', on);
    addEventListener('keyup', on); // Espacio: evita que un botón enfocado se active al soltar
    return () => { removeEventListener('keydown', on); removeEventListener('keyup', on); };
  }, []);

  if (load.status === 'offline') return <Offline onRetry={reload} />;
  if (load.status === 'missing' || load.status === 'error') {
    return (
      <div className="empty" style={{ marginTop: 48 }}>
        <h1 className="display" tabIndex={-1}>{load.status === 'missing' ? 'Ese proyecto no existe' : 'No se pudo abrir el proyecto'}</h1>
        <p>{load.status === 'missing' ? 'Puede que se haya borrado o que el enlace esté mal escrito.' : load.message}</p>
        <div className="row">
          <a className="btn btn-primary px" href="#/proyectos">Ir a la galería</a>
          {load.status === 'error' && <button className="btn" type="button" onClick={reload}><Icon name="refresh" />Reintentar</button>}
        </div>
      </div>
    );
  }
  if (!project || !anim) return <Skeleton />;

  const chip = saveError ? { cls: 'chip-err', icon: 'alert', text: 'Sin guardar' }
    : pending > 0 ? { cls: '', icon: 'clock', text: `Enviando ${pending} ${pending === 1 ? 'cambio' : 'cambios'}` }
    : { cls: 'chip-ok', icon: 'check', text: 'Guardado' };

  return (
    <section className="ed">
      <header className="ed-top">
        <nav className="crumbs" aria-label="Ruta">
          <a href="#/proyectos">Proyectos</a><span className="faint">/</span>
          <h1 className="ed-name" tabIndex={-1}>{project.name}</h1>
        </nav>
        <span className={`chip ${chip.cls}`} role="status"><Icon name={chip.icon} small />{chip.text}</span>
        <div className="grp">
          <button className="icon-btn" type="button" data-tip="Deshacer (Ctrl+Z)" aria-label="Deshacer" onClick={() => void step('undo')}><Icon name="undo" /></button>
          <button className="icon-btn" type="button" data-tip="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer" onClick={() => void step('redo')}><Icon name="redo" /></button>
        </div>
        <div className="grp">
          <button className="icon-btn" type="button" data-tip="Alejar (−)" aria-label="Alejar" disabled={zoom <= 8} onClick={() => setZ(-4)}><Icon name="zoomout" /></button>
          <output className="zoom-v num" aria-label="Zoom">{Math.round((zoom / 4) * 100)}%</output>
          <button className="icon-btn" type="button" data-tip="Acercar (+)" aria-label="Acercar" disabled={zoom >= 40} onClick={() => setZ(4)}><Icon name="zoomin" /></button>
          <button className="icon-btn" type="button" aria-pressed={grid} data-tip="Cuadrícula (#)" aria-label="Cuadrícula" onClick={() => setGrid(!grid)}><Icon name="grid" /></button>
          <button className="icon-btn" type="button" aria-pressed={onion} data-tip="Papel cebolla (O)" aria-label="Papel cebolla" onClick={() => setOnion(!onion)}><Icon name="onion" /></button>
          <button className="icon-btn" type="button" data-tip="Atajos (?)" aria-label="Atajos de teclado" onClick={() => setDialog('shortcuts')}><Icon name="keyboard" /></button>
        </div>
        <div className="grp"><a className="chip chip-agent" href="#/agente"><span className="dot" />Agente conectado</a></div>
        <a className="btn btn-primary px" href={`#/exportar/${project.id}`}><Icon name="export" />Exportar</a>
      </header>

      <div className="ed-body">
        <Tools tool={tool} onTool={setTool} onMirror={mirror} />
        <Stage
          project={project}
          anim={anim}
          frame={frameIdx}
          tool={tool}
          color={activeColor}
          zoom={zoom}
          grid={grid}
          onion={onion}
          flash={agent && flash.length ? flash : []}
          agent={agent}
          sel={sel}
          onSel={setSel}
          onSend={send}
          onPick={(c) => { setColor(c); setTool('pencil'); }}
        />
        <aside className="side" aria-label="Paneles">
          <PalettePanel palette={palette} color={activeColor} onColor={setColor} onEdit={() => setDialog('palette')} />
          <PreviewPanel project={project} animation={anim.name} frame={frameIdx} playing={playing} />
          <HistoryPanel entries={hist} />
        </aside>
      </div>

      <Timeline
        project={project}
        anim={anim}
        frame={frameIdx}
        playing={playing}
        onAnim={(n) => { setAnimName(n); setFrame(0); }}
        onFrame={setFrame}
        onPlay={() => setPlaying(!playing)}
        onNewAnimation={() => setDialog('animation')}
        onSend={send}
      />

      <div className="narrow empty">
        <h2>Usa una pantalla más ancha</h2>
        <p>El editor necesita al menos 900 px de ancho para mostrar el lienzo, la paleta y la línea de tiempo a la vez.</p>
        <a className="btn" href="#/proyectos">Volver a proyectos</a>
      </div>

      {dialog === 'palette' && <PaletteDialog palette={palette} onClose={() => setDialog(null)} onSave={async (p) => {
        const errs = await send([{ type: 'setPalette', palette: p }], { quiet: true });
        if (!errs) toast('Paleta guardada', 'ok', 'Todos los cuadros usan los colores nuevos.');
        return errs;
      }} />}
      {dialog === 'shortcuts' && <ShortcutsDialog onClose={() => setDialog(null)} />}
      {dialog === 'animation' && <NewAnimationDialog onClose={() => setDialog(null)} onCreate={async (name) => {
        const errs = await send([{ type: 'addAnimation', name }], { quiet: true });
        if (!errs) { setAnimName(name); setFrame(0); }
        return errs;
      }} />}
    </section>
  );
}

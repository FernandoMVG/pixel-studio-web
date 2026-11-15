import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Animation, Frame, Project } from '@api';
import { fillCells, paintCells } from './patches.ts';
import { clampMove, inRect, lineCells, moveCells, rectBetween, rectCells, shiftRect, type Rect, type Tool } from './tools.ts';
import type { Cell, Draft, Send } from './types.ts';

type Props = {
  project: Project;
  anim: Animation;
  frame: number;
  tool: Tool;
  color: string;
  zoom: number;
  grid: boolean;
  onion: boolean;
  /** Celdas que acaba de cambiar el agente (se resaltan ~1 s). */
  flash: Cell[];
  agent: { frame: number } | null;
  /** Selección activa (herramienta Selección). */
  sel: Rect | null;
  onSel: (r: Rect | null) => void;
  onSend: Send;
  onPick: (color: string) => void;
};

function draw(cv: HTMLCanvasElement | null, rows: Frame | undefined, project: Project) {
  const ctx = cv?.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, project.width, project.height);
  rows?.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = project.palette[row[x]!];
      if (!c) continue;
      ctx.fillStyle = c.color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

export function Stage({ project, anim, frame, tool, color, zoom, grid, onion, flash, agent, sel, onSel, onSend, onPick }: Props) {
  const { width: w, height: h } = project;
  const cvRef = useRef<HTMLCanvasElement>(null);
  const onionRef = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ start: { x: number; y: number }; last: { x: number; y: number }; cells: Map<string, Cell> } | null>(null);
  /** Arrastre de la herramienta Selección: marcar un rectángulo o mover (copiar con Alt) el ya marcado. */
  const selDrag = useRef<{ mode: 'marquee' | 'move'; start: { x: number; y: number }; copy: boolean } | null>(null);
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  const selecting = tool === 'select';

  const rows = anim.frames[frame];
  const showDraft = draft && draft.animation === anim.name && draft.frame === frame ? draft.cells : null;
  const prev = onion && anim.frames.length > 1 ? anim.frames[(frame - 1 + anim.frames.length) % anim.frames.length] : undefined;

  useEffect(() => {
    draw(cvRef.current, rows && showDraft ? paintCells(rows, showDraft) : rows, project);
  }, [rows, showDraft, project]);
  useEffect(() => draw(onionRef.current, prev, project), [prev, project]);

  const cellAt = (e: PointerEvent, clamp: boolean) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = Math.floor(((e.clientX - r.left) / r.width) * w);
    let y = Math.floor(((e.clientY - r.top) / r.height) * h);
    if (clamp) { x = Math.min(w - 1, Math.max(0, x)); y = Math.min(h - 1, Math.max(0, y)); }
    else if (x < 0 || y < 0 || x >= w || y >= h) return null;
    return { x, y };
  };

  const show = (cells: Cell[]) => setDraft({ animation: anim.name, frame, cells });

  /** Envía las celdas como un lote; el borrador se descarta al terminar (si falló, vuelve a lo confirmado). */
  const commit = (cells: Cell[]) => {
    const real = cells.filter((c) => rows?.[c.y]?.[c.x] !== c.color);
    if (!real.length) return setDraft(null);
    show(real);
    void onSend([{ type: 'setPixels', animation: anim.name, frame, pixels: real }]).finally(() => setDraft(null));
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !rows) return;
    const p = cellAt(e, false);
    if (!p) return;
    if (tool === 'picker') return onPick(rows[p.y]![p.x]!);
    if (selecting) {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (sel && inRect(sel, p)) selDrag.current = { mode: 'move', start: p, copy: e.altKey };
      else { selDrag.current = { mode: 'marquee', start: p, copy: false }; onSel(rectBetween(p, p)); }
      return;
    }
    if (tool === 'bucket') {
      const cells = fillCells(rows, p.x, p.y, color);
      if (!cells.length) return;
      show(cells);
      void onSend([{ type: 'fill', animation: anim.name, frame, x: p.x, y: p.y, color }]).finally(() => setDraft(null));
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = tool === 'eraser' ? '.' : color;
    drag.current = { start: p, last: p, cells: new Map() };
    move(e, c);
  };

  const move = (e: PointerEvent<HTMLDivElement>, forced?: string) => {
    const d = drag.current;
    setHover(cellAt(e, false));
    const s = selDrag.current;
    if (s && rows) {
      const p = cellAt(e, true)!;
      if (s.mode === 'marquee') onSel(rectBetween(s.start, p));
      else if (sel) {
        const { dx, dy } = clampMove(rows, sel, p.x - s.start.x, p.y - s.start.y);
        setOffset({ dx, dy });
        show(moveCells(rows, sel, dx, dy, s.copy));
      }
      return;
    }
    if (!d) return;
    const c = forced ?? (tool === 'eraser' ? '.' : color);
    if (tool === 'pencil' || tool === 'eraser') {
      const p = cellAt(e, true)!;
      for (const cell of lineCells(d.last, p, c)) d.cells.set(`${cell.x},${cell.y}`, cell);
      d.last = p;
    } else {
      const p = cellAt(e, true)!;
      d.cells = new Map((tool === 'line' ? lineCells(d.start, p, c) : rectCells(d.start, p, c)).map((cell) => [`${cell.x},${cell.y}`, cell]));
    }
    show([...d.cells.values()]);
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d) commit([...d.cells.values()]);
    const s = selDrag.current;
    selDrag.current = null;
    if (s?.mode === 'move' && sel && rows && offset) {
      commit(moveCells(rows, sel, offset.dx, offset.dy, s.copy));
      onSel(shiftRect(sel, offset.dx, offset.dy, w, h));
    }
    setOffset(null);
  };
  const cancel = () => {
    drag.current = null;
    selDrag.current = null;
    setOffset(null);
    setDraft(null);
  };
  const box = selecting && sel ? { x0: sel.x0 + (offset?.dx ?? 0), y0: sel.y0 + (offset?.dy ?? 0), x1: sel.x1 + (offset?.dx ?? 0), y1: sel.y1 + (offset?.dy ?? 0) } : null;

  const style = { ['--w' as string]: w, ['--h' as string]: h, ['--z' as string]: `${zoom}px` };
  return (
    <div className="stage">
      {agent && (
        <div className="banner" role="status">
          <span className="live" />
          <span><b>El agente está dibujando</b> <span className="muted">en el cuadro {agent.frame + 1}</span></span>
        </div>
      )}
      <div className="stage-scroll">
        <div className="cv-wrap px" style={style}>
          <div
            className="cv-inner"
            data-cursor={selecting && sel && hover && inRect(sel, hover) ? 'move' : undefined}
            onPointerDown={down}
            onPointerMove={(e) => move(e)}
            onPointerUp={up}
            onPointerCancel={cancel}
            onPointerLeave={() => !drag.current && setHover(null)}
          >
            <canvas ref={onionRef} className="onion" width={w} height={h} hidden={!prev} />
            <canvas ref={cvRef} width={w} height={h} role="img" aria-label={`Lienzo de ${w} por ${h} píxeles`} />
            <div className={`gridlines${grid ? '' : ' off'}`} />
            {flash.map((c) => <div key={`${c.x},${c.y}`} className="agent-cell" style={{ left: c.x * zoom, top: c.y * zoom }} />)}
            {box && <div className="sel-box" style={{ left: box.x0 * zoom, top: box.y0 * zoom, width: (box.x1 - box.x0 + 1) * zoom, height: (box.y1 - box.y0 + 1) * zoom }} />}
            {hover && !selecting && <div className="hover-cell" style={{ left: hover.x * zoom, top: hover.y * zoom }} />}
          </div>
        </div>
      </div>
      <div className="stage-foot num">
        <span>{hover ? `x ${hover.x}  y ${hover.y}` : 'x –  y –'}</span>
        {selecting ? <span className="sel-hint">{sel ? 'Arrastra para mover · Alt copia · flechas · Supr borra · Esc suelta' : 'Arrastra para seleccionar · Ctrl+A todo'}</span> : <span>{w} × {h}</span>}
        <span>cuadro {frame + 1} de {anim.frames.length}</span>
      </div>
    </div>
  );
}


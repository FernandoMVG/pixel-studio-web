import { useState, type FormEvent } from 'react';
import type { Palette } from '@api';
import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';

type Row = { id: number; key: string; color: string; name: string };
type Props = { palette: Palette; onClose: () => void; onSave: (palette: Palette) => Promise<string[] | null> };

let nextId = 0;

export function PaletteDialog({ palette, onClose, onSave }: Props) {
  const [rows, setRows] = useState<Row[]>(() => Object.entries(palette).map(([key, v]) => ({ id: nextId++, key, color: v.color, name: v.name })));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const edit = (id: number, patch: Partial<Row>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setErrors([]);
  };

  const add = () => {
    const free = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((l) => !rows.some((r) => r.key === l)) ?? 'A';
    setRows([...rows, { id: nextId++, key: free, color: '#888888', name: `Color ${free}` }]);
  };

  const remove = (id: number) => {
    if (rows.length <= 4) return setErrors(['La paleta necesita al menos 4 colores además del transparente.']);
    setRows(rows.filter((r) => r.id !== id));
    setErrors([]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const seen: Record<string, string> = {};
    for (const r of rows) {
      const name = r.name.trim() || r.key;
      if (!/^[A-Z]$/.test(r.key)) return setErrors([`La letra de «${name}» debe ser una sola letra de la A a la Z.`]);
      if (seen[r.key]) return setErrors([`La letra '${r.key}' ya la usa «${seen[r.key]}». Elige otra letra para «${name}».`]);
      seen[r.key] = name;
    }
    setBusy(true);
    const errs = await onSave(Object.fromEntries(rows.map((r) => [r.key, { color: r.color.toUpperCase(), name: r.name.trim() }])));
    if (!errs) return onClose();
    setErrors(errs);
    setBusy(false);
  };

  return (
    <Dialog labelledBy="dt" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head">
          <h2 id="dt">Paleta</h2>
          <button className="icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="dlg-body">
          <p className="hint">Entre 4 y 6 colores. Cada color se escribe con una letra: así aparece en el archivo y en lo que lee el agente. Cambiar un color actualiza todos los cuadros. Para cambiar una letra que ya se usa, primero pinta esos píxeles con otro color.</p>
          <div className="pal-rows">
            <div className="row nowrap">
              <span className="sw clear" style={{ cursor: 'default' }}><b>.</b></span>
              <input className="input mono pk" value="." disabled aria-label="Letra" />
              <input className="input" value="Transparente" disabled aria-label="Nombre" />
              <span style={{ width: 40, flex: 'none' }} />
            </div>
            {rows.map((r) => (
              <div key={r.id} className="row nowrap">
                <input className="color-in" type="color" value={r.color} aria-label={`Color de ${r.name}`} onChange={(e) => edit(r.id, { color: e.target.value })} />
                <input className="input mono pk" value={r.key} maxLength={1} aria-label={`Letra de ${r.name}`} onChange={(e) => edit(r.id, { key: e.target.value.toUpperCase() })} />
                <input className="input" value={r.name} aria-label="Nombre del color" onChange={(e) => edit(r.id, { name: e.target.value })} />
                <button className="icon-btn" type="button" aria-label={`Quitar ${r.name}`} onClick={() => remove(r.id)}><Icon name="trash" small /></button>
              </div>
            ))}
          </div>
          {errors.length > 0 && (
            <div role="alert" className="pal-errs">
              {errors.map((m) => <span key={m} className="err-msg"><Icon name="alert" small />{m}</span>)}
            </div>
          )}
          <button className="btn btn-ghost" type="button" onClick={add} disabled={rows.length >= 6} style={{ justifySelf: 'start' }}><Icon name="plus" />Añadir color</button>
        </div>
        <div className="dlg-foot">
          <button className="btn" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary px" type="submit" disabled={busy}>Guardar paleta</button>
        </div>
      </form>
    </Dialog>
  );
}

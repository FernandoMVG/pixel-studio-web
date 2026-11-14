import { useState, type FormEvent } from 'react';
import { api, ApiRequestError } from '../../infra/api.ts';
import { navigate } from '../../shared/router.ts';
import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';
import { useToast } from '../../shared/ui/toast.tsx';
import { PRESETS } from './presets.ts';
import { PaletteStrip } from './PaletteStrip.tsx';

export function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const side = Number(data.get('size'));
    setBusy(true);
    try {
      const p = await api.createProject({
        name: String(data.get('name')).trim(),
        width: side,
        height: side,
        palette: PRESETS[String(data.get('pal'))]!.palette,
      });
      toast('Proyecto creado', 'ok', `${p.name} se guardó como ${p.id}.json`);
      navigate(`#/editor/${p.id}`);
    } catch (err) {
      if (!(err instanceof ApiRequestError)) {
        toast('No se pudo crear el proyecto', 'err', 'Revisa que pixel-api siga en marcha.');
        onClose();
        return;
      }
      setError(err.messages[0] ?? 'No se pudo crear el proyecto.');
      setBusy(false);
      form.querySelector<HTMLInputElement>('input[name=name]')?.focus();
    }
  };

  return (
    <Dialog labelledBy="dt" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head">
          <h2 id="dt">Nuevo proyecto</h2>
          <button className="icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="dlg-body">
          <div className="field">
            <label htmlFor="nName">Nombre</label>
            <input className="input" id="nName" name="name" autoFocus autoComplete="off" placeholder="Por ejemplo, Bruma" aria-invalid={!!error} aria-describedby="nErr" onChange={() => setError('')} />
            {error && <span className="err-msg" id="nErr"><Icon name="alert" small />{error}</span>}
          </div>
          <div className="field">
            <span className="lbl-t" id="szl">Tamaño del lienzo</span>
            <div className="seg" role="radiogroup" aria-labelledby="szl">
              {[16, 24, 32].map((n) => (
                <label key={n}><input type="radio" name="size" value={n} defaultChecked={n === 16} />{n} × {n}</label>
              ))}
            </div>
            <span className="hint">16 × 16 es el tamaño recomendado para mascotas y avatares.</span>
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl-t" style={{ marginBottom: 6 }}>Paleta inicial</legend>
            <div className="fmts" style={{ margin: 0, gridTemplateColumns: '1fr 1fr' }}>
              {Object.entries(PRESETS).map(([key, preset], i) => (
                <label key={key} className="fmt" style={{ gridTemplateColumns: '1fr' }}>
                  <input type="radio" name="pal" value={key} defaultChecked={i === 0} />
                  <span><b>{preset.name}</b><span style={{ display: 'block', marginTop: 6 }}><PaletteStrip palette={preset.palette} size={20} /></span></span>
                </label>
              ))}
            </div>
            <span className="hint">Podrás cambiar colores y letras en cualquier momento desde el editor.</span>
          </fieldset>
        </div>
        <div className="dlg-foot">
          <button className="btn" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary px" type="submit" disabled={busy}>Crear proyecto</button>
        </div>
      </form>
    </Dialog>
  );
}

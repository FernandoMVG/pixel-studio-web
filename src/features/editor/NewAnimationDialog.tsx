import { useState, type FormEvent } from 'react';
import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';

type Props = { onClose: () => void; onCreate: (name: string) => Promise<string[] | null> };

export function NewAnimationDialog({ onClose, onCreate }: Props) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const errors = await onCreate(String(new FormData(e.currentTarget).get('name')).trim());
    if (!errors) return onClose();
    setError(errors.join(' '));
    setBusy(false);
  };

  return (
    <Dialog labelledBy="dt" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="dlg-head">
          <h2 id="dt">Nueva animación</h2>
          <button className="icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="dlg-body">
          <div className="field">
            <label htmlFor="aName">Nombre</label>
            <input className="input" id="aName" name="name" autoFocus autoComplete="off" placeholder="Por ejemplo, caminar" aria-invalid={!!error} aria-describedby="aErr" onChange={() => setError('')} />
            {error && <span className="err-msg" id="aErr"><Icon name="alert" small />{error}</span>}
          </div>
        </div>
        <div className="dlg-foot">
          <button className="btn" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary px" type="submit" disabled={busy}>Crear animación</button>
        </div>
      </form>
    </Dialog>
  );
}

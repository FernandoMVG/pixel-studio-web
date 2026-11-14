import { useState } from 'react';
import type { Project } from '@api';
import { api, ApiRequestError } from '../../infra/api.ts';
import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';
import { useToast } from '../../shared/ui/toast.tsx';
import { animationsLabel } from './ProjectCard.tsx';

type Props = { project: Project; onClose: () => void; onDeleted: () => void };

export function DeleteProjectDialog({ project, onClose, onDeleted }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.deleteProject(project.id);
      toast('Proyecto borrado', 'ok', `${project.name} ya no está en tu carpeta.`);
      onDeleted();
    } catch (e) {
      toast('No se pudo borrar el proyecto', 'err', e instanceof ApiRequestError ? e.messages[0] : 'Revisa que pixel-api siga en marcha.');
      setBusy(false);
    }
  };

  return (
    <Dialog labelledBy="dt" onClose={onClose}>
      <div className="dlg-head"><h2 id="dt">¿Borrar {project.name}?</h2></div>
      <div className="dlg-body">
        <p className="muted">
          Se borrará <span className="mono">{project.id}.json</span> con sus {animationsLabel(project)}. Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="dlg-foot">
        <button className="btn" type="button" autoFocus onClick={onClose}>Conservar</button>
        <button className="btn btn-danger" type="button" disabled={busy} onClick={confirm}><Icon name="trash" />Borrar proyecto</button>
      </div>
    </Dialog>
  );
}

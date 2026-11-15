import { Dialog } from '../../shared/ui/Dialog.tsx';
import { Icon } from '../../shared/ui/Icons.tsx';

const GROUPS: [string, [string, string][]][] = [
  ['Herramientas', [['B', 'Lápiz'], ['E', 'Borrador'], ['G', 'Relleno'], ['I', 'Cuentagotas'], ['L', 'Línea'], ['U', 'Rectángulo'], ['M', 'Selección'], ['H', 'Espejo horizontal']]],
  ['Selección', [['Arrastrar', 'Mover lo seleccionado'], ['Alt + arrastrar', 'Copiar lo seleccionado'], ['Flechas', 'Mover un píxel'], ['Supr', 'Borrar lo seleccionado'], ['Esc', 'Quitar la selección'], ['Ctrl A', 'Seleccionar todo']]],
  ['Lienzo', [['0 – 6', 'Elegir color'], ['#', 'Cuadrícula'], ['O', 'Papel cebolla'], ['+ / −', 'Acercar y alejar']]],
  ['Animación', [['Espacio', 'Reproducir o pausar'], [', / .', 'Cuadro anterior y siguiente']]],
  ['General', [['Ctrl Z', 'Deshacer'], ['Ctrl Shift Z', 'Rehacer'], ['?', 'Ver atajos']]],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog labelledBy="dt" onClose={onClose}>
      <div className="dlg-head">
        <h2 id="dt">Atajos de teclado</h2>
        <button className="icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="dlg-body keys">
        {GROUPS.map(([group, list]) => (
          <div key={group}>
            <h3>{group}</h3>
            <dl>
              {list.map(([k, d]) => (
                <div key={k}>
                  <dt>{d}</dt>
                  <dd className="row">{k.split(' ').map((x) => <kbd key={x}>{x}</kbd>)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

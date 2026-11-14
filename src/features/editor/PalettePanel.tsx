import type { Palette } from '@api';

/** Letra oscura sobre colores claros, igual que `lt()` del prototipo. */
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.62;
};

type Props = { palette: Palette; color: string; onColor: (c: string) => void; onEdit: () => void };

export function PalettePanel({ palette, color, onColor, onEdit }: Props) {
  return (
    <section className="panel">
      <div className="panel-h">
        <h2>Paleta</h2>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onEdit}>Editar</button>
      </div>
      <div className="pal-grid" role="group" aria-label="Colores">
        <button className="sw clear" type="button" aria-pressed={color === '.'} aria-label="Transparente, tecla 0" data-tip="Transparente (0)" onClick={() => onColor('.')}><b>.</b></button>
        {Object.entries(palette).map(([k, { color: hex, name }], i) => (
          <button key={k} className={`sw${isLight(hex) ? ' lt' : ''}`} type="button" style={{ ['--c' as string]: hex }} aria-pressed={color === k} aria-label={`${name}, letra ${k}, tecla ${i + 1}`} data-tip={`${name} (${i + 1})`} onClick={() => onColor(k)}><b>{k}</b></button>
        ))}
      </div>
    </section>
  );
}

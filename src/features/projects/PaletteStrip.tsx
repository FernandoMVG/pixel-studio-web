import type { Project } from '@api';

export function PaletteStrip({ palette, size }: { palette: Project['palette']; size?: number }) {
  return (
    <div className="strip-pal" aria-label="Paleta">
      {Object.entries(palette).map(([key, { color, name }]) => (
        <span key={key} className="sw mini" style={{ ['--c' as string]: color, ...(size && { width: size, height: size }) }} title={`${key} ${name}`} />
      ))}
    </div>
  );
}

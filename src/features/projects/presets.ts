import type { Project } from '@api';

type Preset = { name: string; palette: Project['palette'] };

const p = (entries: Record<string, [string, string]>): Project['palette'] =>
  Object.fromEntries(Object.entries(entries).map(([k, [color, name]]) => [k, { color, name }]));

export const PRESETS: Record<string, Preset> = {
  noche: { name: 'Noche', palette: p({ K: ['#24203F', 'Contorno'], P: ['#8C7CF2', 'Cuerpo'], L: ['#CFC6FF', 'Brillo'], W: ['#FFFFFF', 'Ojos'], R: ['#FF7A9A', 'Detalle'] }) },
  bosque: { name: 'Bosque', palette: p({ K: ['#1F2A1C', 'Contorno'], G: ['#6CC24A', 'Cuerpo'], L: ['#D9F2A8', 'Brillo'], W: ['#FFFFFF', 'Ojos'], R: ['#FF8B6B', 'Detalle'] }) },
  lata: { name: 'Lata', palette: p({ K: ['#1C2433', 'Contorno'], G: ['#6FD3C1', 'Cuerpo'], D: ['#3E8F8A', 'Sombra'], W: ['#F4FBFF', 'Luz'] }) },
  ocaso: { name: 'Ocaso', palette: p({ K: ['#2B1A2E', 'Contorno'], O: ['#FF9F43', 'Cuerpo'], R: ['#E2445C', 'Sombra'], Y: ['#FFE08A', 'Brillo'], W: ['#FFFFFF', 'Ojos'] }) },
};

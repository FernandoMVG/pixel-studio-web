# pixel-web

Editor visual de Pixel Studio (React + Vite + TypeScript). Reglas generales en `../CLAUDE.md`; diseño de referencia en `../docs/diseno/prototipo.html`.

## Comandos
| Comando | Uso |
|---|---|
| `npm run dev` | Editor en http://localhost:5173 (necesita `pixel-api` en marcha) |
| `npm run build` | Build de producción |

## Estructura
- `src/features/<funcionalidad>/`: pantallas, componentes y estado de cada funcionalidad.
- `src/infra/`: cliente HTTP y WebSocket de `pixel-api`.
- `src/shared/ui/`: componentes del sistema de diseño "mesa de luz"; `src/shared/styles/`: tokens y estilos base.

## Convenciones
- CSS plano con los tokens de `src/shared/styles/tokens.css`. Sin Tailwind ni librerías de componentes.
- Textos visibles en español; código en inglés.
- La lógica de dibujo vive en `pixel-api`: la web pinta localmente para responder al instante y envía los cambios en lotes.

import { useEffect, useState } from 'react';
import { Icon } from './Icons.tsx';

const SECONDS = 5;

/** Vista "Sin conexión con pixel-api": reintenta sola cada 5 s. */
export function Offline({ onRetry }: { onRetry: () => void }) {
  const [left, setLeft] = useState(SECONDS);
  useEffect(() => {
    if (left === 0) {
      onRetry();
      return;
    }
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onRetry]);

  return (
    <div className="off">
      <div className="off-card">
        <span className="px" style={{ display: 'grid', placeItems: 'center', width: 72, height: 72, background: 'var(--err-soft)', color: 'var(--err)' }}>
          <Icon name="unplug" />
        </span>
        <h1 className="display" tabIndex={-1}>Sin conexión con pixel-api</h1>
        <p className="muted">
          El editor no encuentra el servidor en <span className="mono">localhost:4317</span>. Tus proyectos están a salvo en la carpeta; solo falta arrancar el servidor.
        </p>
        <ol className="steps">
          <li><span>Abre una terminal en la carpeta <span className="mono">pixel-api</span>.</span></li>
          <li><span>Ejecuta <span className="mono">npm run dev</span> y espera el mensaje «Pixel Studio API en http://127.0.0.1:4317».</span></li>
        </ol>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary px" type="button" onClick={onRetry}>
            <Icon name="refresh" />Reintentar ahora
          </button>
          <span className="hint num">Reintento automático en {left} s</span>
        </div>
      </div>
    </div>
  );
}

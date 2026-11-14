import type { HistoryEntry } from './types.ts';

const WHO = { tu: 'Tú', agente: 'Agente', otra: 'Otra pestaña' } as const;

export function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  return (
    <section className="panel">
      <div className="panel-h"><h2>Historial</h2><span className="hint num">{entries.length ? `${entries.length} ${entries.length === 1 ? 'cambio' : 'cambios'}` : ''}</span></div>
      <ul className="hist" aria-label="Últimos cambios">
        {entries.length === 0 && <li className="faint">Cada cambio aparece aquí, el más reciente arriba.</li>}
        {entries.map((e) => (
          <li key={e.id}>
            <span className={`who ${e.by === 'agente' ? 'agent' : e.by === 'otra' ? 'other' : ''}`} />
            <span>{e.text}<small>{WHO[e.by]}</small></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

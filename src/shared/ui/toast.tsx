import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icons.tsx';

type Kind = 'ok' | 'err' | 'agent';
type Item = { id: number; msg: string; kind: Kind; sub?: string };
type Push = (msg: string, kind?: Kind, sub?: string) => void;

const ToastContext = createContext<Push>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(0);
  const close = (id: number) => setItems((l) => l.filter((t) => t.id !== id));

  const push = useCallback<Push>((msg, kind = 'ok', sub) => {
    const id = next.current++;
    setItems((l) => [{ id, msg, kind, sub }, ...l]);
    if (kind !== 'err') setTimeout(() => close(id), 3600);
  }, []);

  return (
    <ToastContext value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === 'err' ? 'alert' : t.kind === 'agent' ? 'agent' : 'check'} />
            <p>
              {t.msg}
              {t.sub && <small>{t.sub}</small>}
            </p>
            <button className="icon-btn" type="button" aria-label="Cerrar aviso" onClick={() => close(t.id)}>
              <Icon name="close" small />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

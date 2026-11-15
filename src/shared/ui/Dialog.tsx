import { useEffect, useRef, type ReactNode } from 'react';

type Props = { labelledBy: string; onClose: () => void; className?: string; children: ReactNode };

/** `<dialog>` nativo modal: Esc y clic fuera lo cierran (closedby="any"). */
export function Dialog({ labelledBy, onClose, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={className} closedby="any" aria-labelledby={labelledBy} onClose={onClose}>
      {children}
    </dialog>
  );
}

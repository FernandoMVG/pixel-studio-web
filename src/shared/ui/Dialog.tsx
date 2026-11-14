import { useEffect, useRef, type ReactNode } from 'react';

type Props = { labelledBy: string; onClose: () => void; children: ReactNode };

/** `<dialog>` nativo modal: Esc y clic fuera lo cierran (closedby="any"). */
export function Dialog({ labelledBy, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} closedby="any" aria-labelledby={labelledBy} onClose={onClose}>
      {children}
    </dialog>
  );
}

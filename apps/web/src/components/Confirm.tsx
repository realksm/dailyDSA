// Themed replacement for window.confirm(). `const ask = useConfirm(); if (!(await ask({...}))) return;`
// One native <dialog> for the whole app: it gives us the top layer, a focus trap and Esc for free.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive: red confirm button, and focus starts on Cancel. */
  danger?: boolean;
};

type Ask = (o: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<Ask>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const ask = useCallback<Ask>((o) => {
    resolver.current?.(false); // a newer question replaces an unanswered one
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setReq(o);
    });
  }, []);

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    dialog.current?.close();
    setReq(null);
  };

  useEffect(() => {
    const d = dialog.current;
    if (req && d && !d.open) d.showModal();
  }, [req]);

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <dialog
        ref={dialog}
        className="confirm"
        aria-labelledby="confirm-title"
        aria-describedby={req?.body ? "confirm-body" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
        // The dialog itself has no padding, so a click whose target is the dialog landed on the backdrop.
        onClick={(e) => e.target === e.currentTarget && finish(false)}
      >
        {req && (
          <form
            className="confirm-inner"
            onSubmit={(e) => {
              e.preventDefault();
              finish(true);
            }}
          >
            <h2 id="confirm-title">{req.title}</h2>
            {req.body && <div id="confirm-body" className="confirm-body">{req.body}</div>}
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => finish(false)} autoFocus={req.danger}>
                {req.cancelLabel ?? "Cancel"}
              </button>
              <button type="submit" className={`btn ${req.danger ? "btn-bad" : "btn-primary"}`} autoFocus={!req.danger}>
                {req.confirmLabel ?? "OK"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </ConfirmCtx.Provider>
  );
}

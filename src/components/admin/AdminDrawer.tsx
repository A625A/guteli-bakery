'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export function AdminDrawer({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const dirty = useRef(new Set<HTMLFormElement | Element>());
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener('beforeunload', warn);
    };
  }, [open]);
  useEffect(() => {
    const saved = (event: Event) => {
      const target = event.target as Element;
      dirty.current.delete(target.closest('form') ?? target);
    };
    const changed = (event: Event) => {
      const target = event.target as Element;
      dirty.current.add(target.closest('form') ?? target);
    };
    const el = dialog.current;
    el?.addEventListener('admin:saved', saved);
    el?.addEventListener('admin:dirty', changed);
    return () => {
      el?.removeEventListener('admin:saved', saved);
      el?.removeEventListener('admin:dirty', changed);
    };
  }, [open]);
  function close() {
    if (dialog.current?.querySelector('[aria-busy="true"]')) return;
    if (
      dirty.current.size &&
      !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?')
    )
      return;
    dialog.current?.close();
    setOpen(false);
    dirty.current.clear();
    button.current?.focus();
  }
  return (
    <>
      <button
        ref={button}
        type="button"
        className="admin-action"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={trigger}
      >
        {trigger.startsWith('Editar ') ? 'Editar' : trigger}
      </button>
      {open
        ? createPortal(
            <dialog
              ref={dialog}
              className="admin-drawer"
              aria-labelledby={id}
              onCancel={(e) => {
                e.preventDefault();
                close();
              }}
            >
              <header>
                <div>
                  <p className="admin-overline">Güteli · Administración</p>
                  <h2 id={id}>{title}</h2>
                </div>
                <button
                  type="button"
                  className="admin-close"
                  aria-label="Cerrar editor"
                  onClick={close}
                >
                  ×
                </button>
              </header>
              <div
                className="admin-drawer__body"
                onChangeCapture={(e) => {
                  const target = e.target as Element;
                  dirty.current.add(target.closest('form') ?? target);
                }}
              >
                {open ? children : null}
              </div>
              <footer>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={close}
                >
                  Volver a la lista
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (dialog.current?.querySelector('[aria-busy="true"]'))
                      return;
                    const form = dialog.current?.querySelector('form');
                    const submit = form?.querySelector<HTMLButtonElement>(
                      'button[type="submit"]',
                    );
                    if (submit?.disabled) return;
                    form?.requestSubmit(submit ?? undefined);
                  }}
                >
                  Guardar cambios
                </button>
              </footer>
            </dialog>,
            document.querySelector('.admin-shell') ?? document.body,
          )
        : null}
    </>
  );
}

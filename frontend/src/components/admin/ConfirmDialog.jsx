import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from './ui';

/**
 * Promise-based confirmation dialog (replaces window.confirm / alert).
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete?', message: '…', confirmLabel: 'Delete', tone: 'danger' }))) return;
 *
 * Options: title, message (string or node), confirmLabel ('Confirm'), cancelLabel ('Cancel';
 * pass null for a single-button notice), tone ('default' | 'danger').
 * Resolves true on confirm, false on cancel / Escape / backdrop click / a newer dialog / unmount.
 */

const ConfirmContext = createContext(null);

function ConfirmModal({ dialog, onSettle }) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    // Safer default focus for destructive actions
    const target = dialog.tone === 'danger' && cancelRef.current ? cancelRef.current : confirmRef.current;
    target?.focus();
  }, [dialog]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onSettle(false);
      return;
    }
    if (e.key === 'Tab') {
      // Keep focus inside the dialog
      const focusables = panelRef.current?.querySelectorAll('button:not([disabled]), a[href]') ?? [];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[10040] flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => onSettle(false)} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={dialog.message ? bodyId : undefined}
        className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          {dialog.title}
        </h2>
        {dialog.message && (
          <div id={bodyId} className="mt-2 text-sm text-gray-600 whitespace-pre-line">
            {dialog.message}
          </div>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {dialog.cancelLabel && (
            <Button ref={cancelRef} variant="outline" onClick={() => onSettle(false)}>
              {dialog.cancelLabel}
            </Button>
          )}
          <Button
            ref={confirmRef}
            variant={dialog.tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => onSettle(true)}
          >
            {dialog.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const returnFocusRef = useRef(null);

  const settle = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    if (el && typeof el.focus === 'function' && document.contains(el)) {
      window.setTimeout(() => el.focus(), 0);
    }
    resolve?.(value);
  }, []);

  const confirm = useCallback((options = {}) => {
    // Only one dialog at a time — a newer request cancels the older one.
    if (resolverRef.current) {
      const previous = resolverRef.current;
      resolverRef.current = null;
      previous(false);
    }
    if (!returnFocusRef.current) returnFocusRef.current = document.activeElement;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: 'Are you sure?',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
        ...options,
      });
    });
  }, []);

  // Never leave a caller awaiting forever if the provider goes away.
  useEffect(
    () => () => {
      if (resolverRef.current) {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        resolve(false);
      }
    },
    [],
  );

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog && <ConfirmModal dialog={dialog} onSettle={settle} />}
    </ConfirmContext.Provider>
  );
}

// Outside a provider fall back to the browser dialog so the action still asks first.
function fallbackConfirm(options = {}) {
  const text = [options.title, typeof options.message === 'string' ? options.message : '']
    .filter(Boolean)
    .join('\n\n');
  if (options.cancelLabel === null) {
    window.alert(text);
    return Promise.resolve(true);
  }
  return Promise.resolve(window.confirm(text || 'Are you sure?'));
}

export function useConfirm() {
  return useContext(ConfirmContext) ?? fallbackConfirm;
}

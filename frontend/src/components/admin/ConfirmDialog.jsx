import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui';

/**
 * Promise-based confirmation dialog (replaces window.confirm / alert).
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete?', message: '…', confirmLabel: 'Delete', tone: 'danger' }))) return;
 *
 * Options: title, message (string or node), confirmLabel ('Confirm'), cancelLabel ('Cancel';
 * pass null for a single-button notice), tone ('default' | 'danger').
 * Resolves true on confirm, false on cancel / Escape / outside click / a newer dialog / unmount.
 *
 * Built on the shadcn (Radix) Dialog, which handles the focus trap, Escape, scroll lock,
 * focus return and aria wiring.
 */

const ConfirmContext = createContext(null);

function ConfirmModal({ dialog, onSettle }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const danger = dialog.tone === 'danger';

  // Safer default focus for destructive actions: Cancel. Otherwise the confirm button.
  const onOpenAutoFocus = (e) => {
    const target = danger && cancelRef.current ? cancelRef.current : confirmRef.current;
    if (target) {
      e.preventDefault();
      target.focus();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onSettle(false); }}>
      <DialogContent
        role="alertdialog"
        hideClose
        onOpenAutoFocus={onOpenAutoFocus}
        {...(dialog.message ? {} : { 'aria-describedby': undefined })}
        className="w-[calc(100%-2rem)] max-w-md gap-0 rounded-2xl border-espresso/10 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="text-base font-semibold leading-snug text-espresso">
            {dialog.title}
          </DialogTitle>
          {dialog.message && (
            <DialogDescription asChild>
              <div className="mt-2 whitespace-pre-line text-sm text-espresso/75">{dialog.message}</div>
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="mt-5 gap-2 sm:space-x-0">
          {dialog.cancelLabel && (
            <Button ref={cancelRef} variant="outline" onClick={() => onSettle(false)}>
              {dialog.cancelLabel}
            </Button>
          )}
          <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} onClick={() => onSettle(true)}>
            {dialog.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const seqRef = useRef(0);

  const settle = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback((options = {}) => {
    // Only one dialog at a time — a newer request cancels the older one.
    if (resolverRef.current) {
      const previous = resolverRef.current;
      resolverRef.current = null;
      previous(false);
    }
    seqRef.current += 1;
    const id = seqRef.current;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: 'Are you sure?',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
        ...options,
        id,
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
      {dialog && <ConfirmModal key={dialog.id} dialog={dialog} onSettle={settle} />}
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

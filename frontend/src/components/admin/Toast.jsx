import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Admin toasts.
 *   const toast = useToast();
 *   toast.success('Saved'); toast.error(getErrorMessage(err)); toast.info('…');
 *
 * StrictMode-safe: timers live in per-toast effects (cleaned up on unmount), state
 * updaters are pure, and an identical message that is already showing is replaced
 * rather than stacked (so a doubled dev-mode effect never shows two toasts).
 */

const ToastContext = createContext(null);

const DURATIONS = { success: 3500, info: 4500, error: 7000 };
const MAX_VISIBLE = 4;

const TONES = {
  success: 'bg-primary text-cream',
  error: 'bg-red-700 text-white',
  info: 'bg-espresso text-cream',
};

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast.duration) return undefined;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 w-full sm:w-auto sm:max-w-sm rounded-lg px-4 py-2.5 text-[13px] font-semibold shadow-lg ${TONES[toast.type] ?? TONES.info}`}
    >
      <span className="flex-1 min-w-0 break-words">{toast.text}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 -mr-1 px-1 text-base leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'success', options = {}) => {
    if (message === null || message === undefined || message === '') return undefined;
    nextId.current += 1;
    const toast = {
      id: nextId.current,
      text: String(message),
      type,
      duration: options.duration ?? DURATIONS[type] ?? 4500,
    };
    setToasts((list) =>
      [...list.filter((t) => !(t.text === toast.text && t.type === toast.type)), toast].slice(-MAX_VISIBLE),
    );
    return toast.id;
  }, []);

  const value = useMemo(
    () => ({
      show,
      success: (message, options) => show(message, 'success', options),
      error: (message, options) => show(message, 'error', options),
      info: (message, options) => show(message, 'info', options),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 left-4 sm:left-auto z-[10050] flex flex-col items-end gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Used only if a component renders outside <ToastProvider>; never throws.
const FALLBACK = {
  show: (m) => console.info('[toast]', m),
  success: (m) => console.info('[toast]', m),
  error: (m) => console.error('[toast]', m),
  info: (m) => console.info('[toast]', m),
  dismiss: () => {},
};

export function useToast() {
  return useContext(ToastContext) ?? FALLBACK;
}

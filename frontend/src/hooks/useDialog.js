import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Accessible behaviour for drawers and modals.
 *
 *   const dialogRef = useDialog(open, onClose);
 *   <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="…" tabIndex={-1}>…</div>
 *
 * While open: Escape closes, focus moves inside (to `initialFocusRef` or the first
 * focusable element) and Tab/Shift+Tab stay trapped inside, background scroll is locked.
 * On close: focus returns to whatever was focused before opening.
 * While closed: the element is made `inert`, so an off-screen drawer can't be tabbed into
 * or read by screen readers. (React 18 has no `inert` prop, so it's set on the DOM node.)
 */

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0,
  );
}

/* Scroll lock shared by every open dialog — the page is restored only when the last one closes.
   It locks <html> (not <body>) so it can't fight the mobile-menu lock in PublicLayout. */
let lockCount = 0;
let saved = null;

function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;
  const root = document.documentElement;
  const scrollbar = window.innerWidth - root.clientWidth;
  saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
  root.style.overflow = 'hidden';
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !saved) return;
  const root = document.documentElement;
  root.style.overflow = saved.overflow;
  root.style.paddingRight = saved.paddingRight;
  saved = null;
}

export function useDialog(open, onClose, { initialFocusRef } = {}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Closed dialogs stay in the DOM (for the slide animation) but must be unreachable.
  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const el = dialogRef.current;
    const previouslyFocused = document.activeElement;

    lockScroll();

    const raf = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current || getFocusable(el)[0] || el;
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const items = getFocusable(el);
      if (items.length === 0) {
        e.preventDefault();
        el.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      unlockScroll();
      if (
        previouslyFocused &&
        previouslyFocused !== document.body &&
        previouslyFocused.isConnected &&
        typeof previouslyFocused.focus === 'function'
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // initialFocusRef is a ref object — stable for the component's lifetime
  }, [open]);

  return dialogRef;
}

export default useDialog;

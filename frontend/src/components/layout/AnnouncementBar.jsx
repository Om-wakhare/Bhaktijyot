import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

// Dismissal lasts for the browser session (until the tab/window is closed)
const STORAGE_KEY = 'bj-announcement-dismissed';

function readDismissed() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // storage blocked (private mode, sandboxed iframe…)
  }
}

function writeDismissed() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore — the bar still hides for this page view */
  }
}

/** The CTA link may be internal ("/products") or a full URL set by the admin. */
function CtaLink({ href, focusable = true, children }) {
  const className = 'underline underline-offset-2 hover:text-gold transition-colors';
  const tabIndex = focusable ? undefined : -1;
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} tabIndex={tabIndex}>
        {children}
      </a>
    );
  }
  return <Link to={href} className={className} tabIndex={tabIndex}>{children}</Link>;
}

export function AnnouncementBar({ text = '', linkText = 'SHOP NOW', linkUrl = '/products', isActive = true }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!isActive || dismissed || !text) return null;

  const dismiss = () => {
    writeDismissed();
    setDismissed(true);
  };

  const renderMessage = (focusable = true) => (
    <>
      {text}
      {linkText && linkUrl && (
        <>
          &nbsp;&nbsp;
          <CtaLink href={linkUrl} focusable={focusable}>{linkText}</CtaLink>
        </>
      )}
    </>
  );

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="bg-espresso text-white/90 text-[11px] font-semibold tracking-widest uppercase relative h-9 overflow-hidden"
    >

      {/* Desktop — centered static (fits on one line) */}
      <div className="hidden md:flex items-center justify-center h-full px-10 text-center leading-none">
        <span>{renderMessage()}</span>
      </div>

      {/* Mobile — single-line marquee (shared .bj-marquee classes; pauses on touch/focus) */}
      <div className="md:hidden bj-marquee overflow-hidden flex items-center h-full">
        <div className="bj-marquee-track whitespace-nowrap" style={{ '--bj-marquee-duration': '18s' }}>
          <span className="flex shrink-0 items-center leading-none">
            {renderMessage()}
            <span className="px-8 text-gold" aria-hidden="true">✦</span>
          </span>
          {/* Visual duplicate for a seamless loop — hidden from screen readers and keyboard */}
          <span
            className="flex shrink-0 items-center leading-none motion-reduce:hidden"
            aria-hidden="true"
            ref={(el) => el && el.setAttribute('inert', '')}
          >
            {renderMessage(false)}
            <span className="px-8 text-gold">✦</span>
          </span>
        </div>
      </div>

      {/* Dismiss — fades text into solid espresso behind it */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-0 top-0 h-full flex items-center pr-3 pl-6 text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
        style={{ background: 'linear-gradient(to right, transparent, #1C1209 45%)' }}
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

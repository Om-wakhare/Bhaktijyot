import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

export function AnnouncementBar({ text = '', linkText = 'SHOP NOW', linkUrl = '/products', isActive = true }) {
  const [dismissed, setDismissed] = useState(false);

  if (!isActive || dismissed || !text) return null;

  const Message = () => (
    <>
      {text}
      {linkText && linkUrl && (
        <>
          &nbsp;&nbsp;
          <Link
            to={linkUrl}
            className="underline underline-offset-2 hover:text-gold transition-colors"
          >
            {linkText}
          </Link>
        </>
      )}
    </>
  );

  return (
    <div className="bg-espresso text-white/90 text-[11px] font-semibold tracking-widest uppercase relative h-9 overflow-hidden">

      {/* Desktop — centered static (fits on one line) */}
      <div className="hidden md:flex items-center justify-center h-full px-10 text-center leading-none">
        <span><Message /></span>
      </div>

      {/* Mobile — single-line marquee */}
      <div className="md:hidden flex items-center h-full">
        <div className="ab-marquee flex whitespace-nowrap">
          {[0, 1].map((k) => (
            <span key={k} className="flex items-center leading-none">
              <Message />
              <span className="px-8 text-gold" aria-hidden="true">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Dismiss — fades text into solid espresso behind it */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-0 top-0 h-full flex items-center pr-3 pl-6 text-white/50 hover:text-white transition-colors"
        style={{ background: 'linear-gradient(to right, transparent, #1C1209 45%)' }}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <style>{`
        .ab-marquee { animation: ab-scroll 18s linear infinite; }
        @keyframes ab-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

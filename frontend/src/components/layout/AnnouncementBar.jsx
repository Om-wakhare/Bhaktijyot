import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

export function AnnouncementBar({ text = '', linkText = 'SHOP NOW', linkUrl = '/products', isActive = true }) {
  const [dismissed, setDismissed] = useState(false);

  if (!isActive || dismissed || !text) return null;

  return (
    <div className="bg-espresso text-white/90 text-[11px] font-semibold tracking-widest uppercase relative flex items-center justify-center h-9 px-10">
      <span className="text-center leading-none">
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
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

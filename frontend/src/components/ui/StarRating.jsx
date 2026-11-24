import { useRef } from 'react';

/**
 * Unified star rating component.
 * Props:
 *   value       — current rating (number, decimals supported)
 *   max         — total stars (default 5)
 *   size        — 'sm' | 'md' | 'lg'
 *   interactive — if true, renders a keyboard-accessible radio group and calls onChange(newValue)
 *   onChange    — (value: number) => void  (required when interactive)
 *   label       — accessible name of the input group (default "Rating")
 *   labelledBy  — id of a visible label for the input group (preferred over `label`)
 *
 * Display mode renders plain, non-interactive markup announced as "Rated 4.5 out of 5".
 */

const SIZES = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' };
const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

function Star({ filled, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill={filled ? '#C9A84C' : 'none'}
      stroke={filled ? '#C9A84C' : '#D4AF37'}
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

export function StarRating({
  value = 0,
  max = 5,
  size = 'sm',
  interactive = false,
  onChange,
  label = 'Rating',
  labelledBy,
}) {
  const starClass = SIZES[size] ?? SIZES.sm;
  const numeric = Number(value) || 0;
  const rounded = Math.round(numeric);
  const buttonsRef = useRef([]);

  if (!interactive) {
    const spoken = numeric.toFixed(1).replace(/\.0$/, '');
    return (
      <span
        role="img"
        aria-label={`Rated ${spoken} out of ${max}`}
        className="inline-flex items-center gap-0.5"
      >
        {Array.from({ length: max }, (_, i) => (
          <Star key={i} filled={i + 1 <= rounded} className={starClass} />
        ))}
      </span>
    );
  }

  const select = (next) => {
    const v = Math.min(max, Math.max(1, next));
    onChange?.(v);
    buttonsRef.current[v - 1]?.focus();
  };

  const onKeyDown = (e) => {
    const current = rounded || 0;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = current >= max ? 1 : current + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = current <= 1 ? max : current - 1;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = max;
    if (next !== null) {
      e.preventDefault();
      select(next);
    }
  };

  // Roving tabindex: only the checked star (or the first, when none) is in the tab order.
  const focusIdx = rounded >= 1 ? rounded - 1 : 0;

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className="flex items-center gap-0.5"
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            ref={(el) => { buttonsRef.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={rounded === starValue}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            tabIndex={i === focusIdx ? 0 : -1}
            onClick={() => select(starValue)}
            className="cursor-pointer rounded hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Star filled={starValue <= rounded} className={starClass} />
          </button>
        );
      })}
    </div>
  );
}

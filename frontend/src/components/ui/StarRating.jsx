/**
 * Unified star rating component.
 * Props:
 *   value      — current rating (number, decimals supported)
 *   max        — total stars (default 5)
 *   size       — 'sm' | 'md' | 'lg'
 *   interactive — if true, renders clickable stars and calls onChange(newValue)
 *   onChange   — (value: number) => void  (required when interactive)
 */
export function StarRating({ value = 0, max = 5, size = 'sm', interactive = false, onChange }) {
  const sizes = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-6 w-6' };
  const starClass = sizes[size] ?? sizes.sm;

  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : undefined}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= Math.round(value);
        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange?.(i + 1) : undefined}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} disabled:pointer-events-none`}
            aria-label={interactive ? `Rate ${i + 1} of ${max}` : undefined}
          >
            <svg
              className={starClass}
              viewBox="0 0 20 20"
              fill={filled ? '#C9A84C' : 'none'}
              stroke={filled ? '#C9A84C' : '#D4AF37'}
              strokeWidth="1.5"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

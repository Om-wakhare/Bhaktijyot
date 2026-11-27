import { useId, useRef } from 'react';
import { Input, cn } from './ui';

/**
 * Stock control for the product forms.
 *
 * The backend stores stock as a number where -1 means "unlimited / not tracked" and
 * 0 or more is a real count. Here the owner picks the mode explicitly, so -1 is never
 * shown as a number and switching modes never silently turns -1 into 0.
 *
 * Props: tracked (bool), count (string), onChange({ tracked, count }), error, disabled.
 */
export function StockField({ tracked, count, onChange, error, disabled }) {
  const uid = useId();
  const countId = `${uid}-count`;
  const hintId = `${uid}-hint`;
  // Remember the last count typed so switching back and forth doesn't lose it
  const lastCount = useRef(count);
  if (tracked) lastCount.current = count;

  const option = (isTracked, label) => {
    const selected = tracked === isTracked;
    return (
      <label
        className={cn(
          'flex min-h-[40px] flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
          selected
            ? 'border-primary bg-primary-50 text-primary-dark'
            : 'border-espresso/20 bg-white text-espresso/75 hover:border-primary',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          type="radio"
          name={`${uid}-mode`}
          className="h-4 w-4 accent-primary"
          checked={selected}
          disabled={disabled}
          onChange={() => onChange({ tracked: isTracked, count: isTracked ? lastCount.current ?? '' : count })}
        />
        {label}
      </label>
    );
  };

  return (
    <fieldset aria-describedby={hintId}>
      <legend className="mb-1 block text-xs font-semibold text-espresso/80">Stock</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        {option(false, 'Unlimited (not tracked)')}
        {option(true, 'Track a count')}
      </div>

      {tracked && (
        <div className="mt-2">
          <label htmlFor={countId} className="sr-only">Number in stock</label>
          <Input
            id={countId}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={count}
            disabled={disabled}
            placeholder="How many do you have?"
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange({ tracked: true, count: e.target.value })}
          />
        </div>
      )}

      {error ? (
        <div id={hintId} className="mt-1 text-[11px] font-medium text-red-700">{error}</div>
      ) : (
        <div id={hintId} className="mt-1 text-[11px] text-espresso/60">
          {tracked
            ? 'Each order reduces this number automatically. At 0 the product shows as out of stock.'
            : 'Always available to order. Choose “Track a count” to sell only what you have.'}
        </div>
      )}
    </fieldset>
  );
}


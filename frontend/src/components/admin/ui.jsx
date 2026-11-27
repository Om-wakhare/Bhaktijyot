import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** `subtitle` is accepted as an alias of `description`. */
export function Page({ title, description, subtitle, actions, children }) {
  const desc = description ?? subtitle;
  return (
    <div className="max-w-7xl mx-auto w-full space-y-5">
      {(title || desc || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
            {desc && <p className="mt-1 text-sm text-gray-600">{desc}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className }) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-2xl shadow-sm', className)}>
      {(title || subtitle || actions) && (
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            {title && <div className="text-sm font-semibold text-gray-900">{title}</div>}
            {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';
const BUTTON_SIZES = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2 text-sm',
};
const BUTTON_VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:border-primary',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
};

export function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  return cn(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className);
}

/**
 * Button. Pass `to` to render a router <Link>, or `href` for a plain <a>,
 * styled as a button (never nest a <button> inside a link).
 * Defaults to type="button" — pass type="submit" explicitly in forms.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, to, href, type, disabled, ...props },
  ref,
) {
  const classes = buttonClasses({ variant, size, className });
  if (to && !disabled) return <Link ref={ref} to={to} className={classes} {...props} />;
  if (href && !disabled) return <a ref={ref} href={href} className={classes} {...props} />;
  return <button ref={ref} type={type ?? 'button'} disabled={disabled} className={classes} {...props} />;
});

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white',
        className,
      )}
      {...props}
    />
  );
});

/** Styled native file input. Reset it by changing its `key`. */
export const FileInput = forwardRef(function FileInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="file"
      className={cn(
        'block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0',
        'file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark file:cursor-pointer',
        className,
      )}
      {...props}
    />
  );
});

export function Field({ label, hint, error, htmlFor, className, children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <div className="mt-1 text-[11px] font-medium text-red-600">{error}</div>
      ) : (
        hint && <div className="mt-1 text-[11px] text-gray-500">{hint}</div>
      )}
    </div>
  );
}

/** On/off switch (e.g. Published / Draft). */
export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-60',
          checked ? 'bg-primary' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all',
            checked ? 'left-[23px]' : 'left-[3px]',
          )}
        />
      </button>
      <div>
        <div className={cn('text-sm font-semibold', checked ? 'text-primary' : 'text-gray-500')}>{label}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
    </div>
  );
}

const ALERT_TONES = {
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-gray-50 border-gray-200 text-gray-700',
};

export function Alert({ tone = 'info', title, children, action, onDismiss, className }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm', ALERT_TONES[tone], className)}
    >
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded px-1 text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function Pill({ className, children, title }) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', className)}
    >
      {children}
    </span>
  );
}

export function CountBadge({ count, className }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={cn(
        'min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold bg-amber-500 text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div role="status" className={cn('py-12 text-center text-sm text-gray-500', className)}>
      {label}
    </div>
  );
}

export function EmptyState({ children, className }) {
  return <div className={cn('py-12 text-center text-sm text-gray-500', className)}>{children}</div>;
}

export function ErrorState({ message, onRetry, className }) {
  return (
    <div role="alert" className={cn('py-10 flex flex-col items-center gap-3 text-center', className)}>
      <p className="text-sm text-red-700 max-w-md">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Status tabs. tabs: [{ value, label, count? }] — use '' as the value for "All". */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-gray-200 overflow-x-auto', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value || '__all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex items-center gap-2 px-3 sm:px-4 py-2.5 -mb-px text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
              active ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            {t.label}
            <CountBadge count={t.count} />
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange, summary, disabled, className }) {
  if (totalPages <= 1 && !summary) return null;
  return (
    <div className={cn('mt-4 flex flex-col sm:flex-row items-center justify-between gap-2', className)}>
      <div className="text-xs text-gray-500">{summary}</div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
            ← Prev
          </Button>
          <span className="text-xs text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

export function Table({ columns, rows, rowKey, className }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-3 font-semibold', c.align === 'right' ? 'text-right' : 'text-left')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-gray-50">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3', c.align === 'right' ? 'text-right' : 'text-left')}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

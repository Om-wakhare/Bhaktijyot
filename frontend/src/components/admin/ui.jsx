function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Page({ title, description, actions, children }) {
  return (
    <div className="max-w-7xl mx-auto w-full space-y-5">
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
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
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors';
  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:border-primary',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white',
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, hint, children }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>}
      {children}
      {hint && <div className="mt-1 text-[11px] text-gray-500">{hint}</div>}
    </div>
  );
}

export function Table({ columns, rows, rowKey }) {
  return (
    <div className="overflow-x-auto">
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

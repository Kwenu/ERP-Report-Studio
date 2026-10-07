interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  /** One slim line (breadcrumb · title · description) — used on report pages so the data gets the space. */
  compact?: boolean;
}

export function PageHeader({ title, subtitle, breadcrumb, actions, compact }: PageHeaderProps) {
  if (compact) {
    return (
      <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          {breadcrumb && breadcrumb.length > 0 &&
          <nav aria-label="Breadcrumb" className="shrink-0 text-2xs text-ink-500">
              {breadcrumb.map((crumb, i) =>
            <span key={crumb}>
                  {i > 0 && <span className="px-1 text-ink-400">/</span>}
                  {crumb}
                </span>
            )}
              <span className="px-1 text-ink-400">/</span>
            </nav>
          }
          <h1 className="shrink-0 text-[15px] font-semibold leading-tight text-ink-900">{title}</h1>
          {subtitle &&
          <div className="min-w-0 truncate text-2xs text-ink-500" title={typeof subtitle === 'string' ? subtitle : undefined}>
              {subtitle}
            </div>
          }
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>);

  }

  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-white px-5 py-3">
      <div>
        {breadcrumb && breadcrumb.length > 0 &&
        <nav aria-label="Breadcrumb" className="mb-1 text-2xs text-ink-500">
            {breadcrumb.map((crumb, i) =>
          <span key={crumb}>
                {i > 0 && <span className="px-1 text-ink-400">/</span>}
                {crumb}
              </span>
          )}
          </nav>
        }
        <h1 className="text-lg font-semibold leading-tight text-ink-900">{title}</h1>
        {subtitle && <div className="mt-0.5 text-xs text-ink-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>);

}

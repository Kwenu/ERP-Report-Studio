
interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumb?: string[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
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
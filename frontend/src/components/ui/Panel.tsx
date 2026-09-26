
interface PanelProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  actions,
  children,
  className = '',
  bodyClassName = ''
}: PanelProps) {
  return (
    <section
      className={`border border-line bg-white shadow-panel rounded ${className}`}>
      
      {(title || actions) &&
      <header className="flex h-10 items-center justify-between border-b border-line bg-surface-muted px-3">
          <h2 className="text-[13px] font-semibold text-ink-900">{title}</h2>
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </header>
      }
      <div className={bodyClassName}>{children}</div>
    </section>);

}
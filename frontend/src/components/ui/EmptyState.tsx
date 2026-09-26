
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded border border-line bg-surface-muted text-ink-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>);

}
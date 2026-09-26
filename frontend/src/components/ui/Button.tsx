
type Variant = 'primary' | 'default' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
  'bg-accent-500 text-white border border-accent-600 hover:bg-accent-600 disabled:bg-accent-200 disabled:border-accent-200',
  default:
  'bg-white text-ink-700 border border-line hover:bg-surface-muted hover:border-line-strong disabled:text-ink-400',
  ghost:
  'bg-transparent text-ink-700 border border-transparent hover:bg-surface-sunken disabled:text-ink-400',
  danger:
  'bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:text-red-300'
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2 text-xs gap-1.5',
  md: 'h-8 px-3 text-[13px] gap-2'
};

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center rounded font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>
      
      {icon}
      {children}
    </button>);

}
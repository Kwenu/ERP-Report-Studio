import { labelClass } from '../../utils/ui';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-2xs text-ink-500">{hint}</p>}
    </div>);

}
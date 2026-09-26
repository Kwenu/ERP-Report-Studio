
type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'navy';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-700 border-line',
  blue: 'bg-accent-50 text-accent-700 border-accent-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  navy: 'bg-navy-900 text-white border-navy-900'
};

export function Badge({
  tone = 'neutral',
  children,
  className = ''




}: {tone?: Tone;children: React.ReactNode;className?: string;}) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-2xs font-medium ${tones[tone]} ${className}`}>
      
      {children}
    </span>);

}
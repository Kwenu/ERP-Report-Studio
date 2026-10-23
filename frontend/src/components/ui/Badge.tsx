
type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'navy' | 'violet' | 'teal';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-700 border-line',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
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
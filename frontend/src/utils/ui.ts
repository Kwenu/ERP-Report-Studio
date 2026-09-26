export const inputClass =
'h-8 w-full rounded border border-line bg-white px-2 text-[13px] text-ink-900 placeholder:text-ink-400 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300';

export const selectClass =
'h-8 w-full rounded border border-line bg-white px-2 text-[13px] text-ink-900 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300';

export const labelClass =
'block text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-1';

export const tableHeadClass =
'sticky top-0 z-10 bg-surface-muted text-left text-2xs font-semibold uppercase tracking-wide text-ink-500';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
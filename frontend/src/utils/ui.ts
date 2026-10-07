export const inputClass =
'h-8 w-full rounded border border-line bg-white px-2 text-[13px] text-ink-900 placeholder:text-ink-400 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300';

export const selectClass =
'h-8 w-full rounded border border-line bg-white px-2 text-[13px] text-ink-900 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300';

/** Slim controls for toolbars (inputClass/selectClass hard-code h-8, so a smaller height cannot override them). */
export const compactInputClass =
'h-6 rounded border border-line bg-white px-1.5 text-[11px] text-ink-900 placeholder:text-ink-400 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300';

export const compactSelectClass =
'h-6 rounded border border-line bg-white px-1 text-[11px] text-ink-900 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300';

export const labelClass =
'block text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-1';

export const tableHeadClass =
'sticky top-0 z-10 bg-surface-muted text-left text-2xs font-semibold uppercase tracking-wide text-ink-500';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
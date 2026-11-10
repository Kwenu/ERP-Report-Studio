import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredPanelProps {
  /** The button / field the panel belongs to. The panel opens under it (or above it when there is no room below). */
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  /** Tailwind classes for the panel's width, e.g. "w-[340px]". */
  className?: string;
  /** Called when the user clicks anywhere outside the panel and its anchor. */
  onClose: () => void;
  children: ReactNode;
}

const MARGIN = 8;
const GAP = 4;
const PREFERRED_HEIGHT = 340;

/**
 * A pop-up that is drawn on <body> with `position: fixed`, so it can NEVER make the report page (or any parent) grow,
 * scroll or push the fixed template around, however many customers the list holds or wherever the field sits.
 * It is kept inside the browser window: shifted left when it would run off the right edge, and opened upwards when
 * there is more room above the field than below it.
 */
export function AnchoredPanel({ anchorRef, open, className = 'w-[320px]', onClose, children }: AnchoredPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number; maxHeight: number; visibility: 'hidden' | 'visible' }>({
    left: 0,
    top: 0,
    maxHeight: PREFERRED_HEIGHT,
    visibility: 'hidden'
  });

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(panel.offsetWidth, vw - MARGIN * 2);

    const left = Math.max(MARGIN, Math.min(a.left, vw - width - MARGIN));

    const below = vh - a.bottom - GAP - MARGIN;
    const above = a.top - GAP - MARGIN;
    const openUp = below < 260 && above > below;
    const maxHeight = Math.max(160, Math.min(PREFERRED_HEIGHT, openUp ? above : below));
    const height = Math.min(panel.scrollHeight, maxHeight);
    const top = openUp ? Math.max(MARGIN, a.top - GAP - height) : a.bottom + GAP;

    setStyle({ left, top, maxHeight, visibility: 'visible' });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (open) place();
    else setStyle((s) => ({ ...s, visibility: 'hidden' }));
  }, [open, place]);

  // Re-place after the content changes size (search narrowing the list) and when the window or any scroller moves.
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && panel ? new ResizeObserver(() => place()) : null;
    if (observer && panel) observer.observe(panel);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', left: style.left, top: style.top, maxHeight: style.maxHeight, visibility: style.visibility }}
      className={`z-[100] flex max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded border border-line bg-white shadow-lg ${className}`}>
      {children}
    </div>,
    document.body
  );
}

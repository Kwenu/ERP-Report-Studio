import { useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = 'max-w-lg'
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[8vh]">
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 bg-navy-950/40"
          onClick={onClose} />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={`relative w-full ${width} rounded border border-line bg-white shadow-pop`}>
          
            <header className="flex items-start justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
                {description &&
              <p className="mt-0.5 text-xs text-ink-500">{description}</p>
              }
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded p-1 text-ink-500 transition-colors duration-150 hover:bg-surface-sunken hover:text-ink-900">
              
                <XIcon className="h-4 w-4" />
              </button>
            </header>
            <div className="max-h-[62vh] overflow-y-auto erp-scroll px-4 py-3">
              {children}
            </div>
            {footer &&
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-4 py-2.5">
                {footer}
              </footer>
          }
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}
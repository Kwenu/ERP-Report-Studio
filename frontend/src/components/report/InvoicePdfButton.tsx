import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DownloadIcon, ExternalLinkIcon, FileTextIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { fetchInvoicePdf } from '../../services/invoiceApi';

/**
 * A small PDF icon shown next to an invoice number. Clicking it opens the invoice as a PDF in a
 * viewer window (download / open in a new tab included). The PDF is generated on demand from the
 * ERP data — nothing is stored.
 */
export function InvoicePdfButton({ invoiceNo, manualNo }: {invoiceNo: string;manualNo?: string;}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const request = useRef(0); // ignores a response that arrives after the window was closed

  const revoke = (u: string | null) => {
    if (u) URL.revokeObjectURL(u);
  };

  const load = async () => {
    const id = ++request.current;
    setState('loading');
    setError('');
    try {
      const blob = await fetchInvoicePdf(invoiceNo);
      if (id !== request.current) return;
      setUrl((old) => {
        revoke(old);
        return URL.createObjectURL(blob);
      });
      setState('ready');
    } catch (err) {
      if (id !== request.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setState('error');
    }
  };

  const close = () => {
    request.current++;
    setOpen(false);
    setUrl((old) => {
      revoke(old);
      return null;
    });
  };

  const fileName = `Invoice-${invoiceNo.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;

  return (
    <>
      <button
        type="button"
        title={`View invoice ${invoiceNo}${manualNo ? ` (Manual No. ${manualNo})` : ''} as PDF`}
        aria-label={`View invoice ${invoiceNo} as PDF`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          void load();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-accent-600 transition-colors duration-150 hover:bg-accent-100 hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 print:hidden">
        
        <FileTextIcon className="h-3.5 w-3.5" />
      </button>

      {open &&
      createPortal(
        // Rendered on <body> so the table's scrolling/clipping cannot hide it; clicks must not select the row underneath.
        <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <Modal
            open
            onClose={close}
            width="max-w-5xl"
            title={manualNo ? `Invoice ${invoiceNo} · Manual No. ${manualNo}` : `Invoice ${invoiceNo}`}
            description="Generated from the ERP database when you opened it — no PDF file is stored."
            footer={
            <>
                  {url &&
              <>
                      <a
                  href={url}
                  download={fileName}
                  className="inline-flex h-8 items-center gap-2 rounded border border-line bg-white px-3 text-[13px] font-medium text-ink-700 transition-colors duration-150 hover:border-line-strong hover:bg-surface-muted">
                  
                        <DownloadIcon className="h-3.5 w-3.5" /> Download PDF
                      </a>
                      <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-2 rounded border border-line bg-white px-3 text-[13px] font-medium text-ink-700 transition-colors duration-150 hover:border-line-strong hover:bg-surface-muted">
                  
                        <ExternalLinkIcon className="h-3.5 w-3.5" /> Open in new tab
                      </a>
                    </>
              }
                  <Button variant="primary" className="px-4" onClick={close}>
                    Close
                  </Button>
                </>
            }>
            
              {state === 'loading' &&
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-[13px] text-ink-500">
                  <Loader2Icon className="h-6 w-6 animate-spin text-accent-600" />
                  Preparing invoice {invoiceNo}…
                </div>
            }
              {state === 'error' &&
            <div role="alert" className="flex h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
                  <TriangleAlertIcon className="h-6 w-6 text-red-600" />
                  <p className="max-w-lg text-[13px] text-ink-700">{error}</p>
                  <Button onClick={() => void load()}>Try again</Button>
                </div>
            }
              {state === 'ready' && url &&
            <iframe title={`Invoice ${invoiceNo}`} src={url} className="h-[70vh] w-full rounded border border-line bg-surface-muted" />
            }
            </Modal>
          </div>,
        document.body
      )}
    </>);

}

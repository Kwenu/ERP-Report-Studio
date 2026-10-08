import { API_BASE, ApiError, UNAUTHORIZED_EVENT, getAuthToken } from './http';

/**
 * Downloads one invoice as a PDF. The ERP stores no PDF files — the backend draws the invoice on demand
 * from its rows in the ERP database (GET /invoices/pdf?ref=…). Resolves to the PDF bytes as a Blob.
 */
export async function fetchInvoicePdf(invoiceNo: string): Promise<Blob> {
  const token = getAuthToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/invoices/pdf?ref=${encodeURIComponent(invoiceNo)}`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  } catch {
    throw new ApiError(
      `Cannot reach the backend at ${API_BASE}. Check that it is running (npm run dev in /backend).`,
      0
    );
  }
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    let message = `The server answered ${res.status}.`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status);
  }
  return res.blob();
}

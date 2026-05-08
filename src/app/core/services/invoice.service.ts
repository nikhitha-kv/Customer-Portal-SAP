import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SoapService } from './soap.service';
import { extractValue } from '../utils/xml-parser.util';

@Injectable({ providedIn: 'root' })
export class InvoiceService {

  constructor(private soap: SoapService) {}

  /**
   * Download invoice PDF as base64 string
   * @param vbeln - Sales/Invoice document number
   */
  getInvoicePdf(vbeln: string): Observable<string> {
    return this.soap.call('invoice', 'Z_CP_902095_INV_PDF_FM', {
      I_VBELN: vbeln
    }).pipe(
      map(doc => {
        const base64 = (doc.getElementsByTagName('E_PDF')[0]?.textContent || '').trim();
        return base64;
      })
    );
  }

  /**
   * Convert base64 PDF string to Blob and trigger download
   */
  downloadPdf(base64: string, filename: string): void {
    const cleanBase64 = base64.replace(/\s/g, '');
    const byteChars = atob(cleanBase64);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteChars.length; offset += 512) {
      const slice = byteChars.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays, { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Create an object URL for PDF preview in the browser
   */
  getPdfPreviewUrl(base64: string): string {
    const cleanBase64 = base64.replace(/\s/g, '');
    const byteChars = atob(cleanBase64);
    const byteArrays: Uint8Array[] = [];
    for (let offset = 0; offset < byteChars.length; offset += 512) {
      const slice = byteChars.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }
}

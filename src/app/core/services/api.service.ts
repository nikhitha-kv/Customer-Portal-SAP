import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import { SoapService } from './soap.service';
import { FinancialService } from './financial.service';
import { InquiryItem, LodItem, PaymentItem, FinanceOverview } from '../models/api.model';

/** Helper: get first non-empty text content from a list of tag names within an element */
function tagVal(el: Element, ...tags: string[]): string {
  for (const tag of tags) {
    const node = el.getElementsByTagName(tag)[0];
    if (node && node.textContent && node.textContent.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

/** Helper: parse table rows from doc with multiple fallback row tags */
function parseRows(doc: Document, ...rowTags: string[]): Element[] {
  for (const tag of rowTags) {
    const found = doc.getElementsByTagName(tag);
    if (found.length > 0) {
      return Array.from(found);
    }
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private soap: SoapService,
    private financialSvc: FinancialService
  ) {}

  getInquiries(kunnr: string): Observable<InquiryItem[]> {
    return this.soap.call('inquiry', 'Z_CP_902095_INQ_FM', { I_KUNNR: kunnr }).pipe(
      map(doc => {
        console.log('[ApiService.getInquiries] XML:', new XMLSerializer().serializeToString(doc));
        const rows = parseRows(doc, 'item', 'ET_INQ', 'T_VBAP', 'INQ', 'row', 'record', 'INQUIRY');
        return rows
          .map(el => ({
            inquiryNumber: tagVal(el, 'VBELN', 'VBELN_VA', 'INQUIRY', 'AUFNR', 'BELNR'),
            date: tagVal(el, 'AUDAT', 'ERDAT', 'ANGDT', 'DATE', 'BLDAT', 'BUDAT'),
            amount: tagVal(el, 'NETWR', 'NETTO', 'KWMENG', 'AMOUNT', 'WRBTR', 'BRUTTO'),
            status: tagVal(el, 'GBSTK', 'STATUS', 'ABGST', 'FKSTK', 'BEARG', 'RFSTK'),
          }))
          .filter(i => i.inquiryNumber);
      })
    );
  }

  getDeliveries(kunnr: string): Observable<LodItem[]> {
    return this.soap.call('lod', 'Z_CP_902095_LOD_FM', { I_KUNNR: kunnr }).pipe(
      map(doc => {
        console.log('[ApiService.getDeliveries] XML:', new XMLSerializer().serializeToString(doc));
        const rows = parseRows(doc, 'item', 'ET_LOD', 'ET_DEL', 'T_LIKP', 'DELIVERY', 'row', 'record');
        return rows
          .map(el => ({
            deliveryNumber: tagVal(el, 'VBELN', 'VBELN_VL', 'DELIVERY', 'LIPS_VBELN', 'BELNR'),
            deliveryDate: tagVal(el, 'LFDAT', 'WADAT', 'WADAT_IST', 'DATE', 'BLDAT', 'BUDAT', 'ERDAT'),
            deliveryType: tagVal(el, 'LFART', 'VBTYP', 'TYPE', 'LFART_E', 'MVGR1'),
            refSalesOrder: tagVal(el, 'VGBEL', 'AUBEL', 'SALES_ORDER', 'VBELN_VA', 'VBELV'),
          }))
          .filter(i => i.deliveryNumber);
      })
    );
  }

  getPayments(kunnr: string): Observable<PaymentItem[]> {
    return this.soap.call('payment', 'Z_CP_902095_PAY_FM', { I_KUNNR: kunnr }).pipe(
      map(doc => {
        console.log('[ApiService.getPayments] XML:', new XMLSerializer().serializeToString(doc));
        const rows = parseRows(doc, 'item', 'ET_PAY', 'ET_BSID', 'PAYMENT', 'T_BSAK', 'row', 'record');
        return rows
          .map(el => ({
            docNumber: tagVal(el, 'BELNR', 'BELNR_D', 'DOC_NO', 'INVOICE', 'XBLNR', 'VBELN'),
            date: tagVal(el, 'BUDAT', 'BLDAT', 'ZFBDT', 'DATE', 'AUGDT', 'CPUDT'),
            amount: tagVal(el, 'WRBTR', 'DMBTR', 'AMOUNT', 'NETWR', 'HWBAS', 'FWBAS'),
            status: tagVal(el, 'STATUS', 'AUGST', 'LIFNR', 'AUGDT', 'UMSKS'),
          }))
          .filter(i => i.docNumber);
      })
    );
  }

  /**
   * Finance Overview: Try the dedicated fi_ov API first.
   * If it fails (SOAP fault / 500), fall back to computing from FI invoices.
   */
  getFinanceOverview(kunnr: string): Observable<FinanceOverview> {
    return this.soap.call('fi_ov', 'Z_CP_902095_FI_OV_FM', { I_KUNNR: kunnr }).pipe(
      map(doc => {
        console.log('[ApiService.getFinanceOverview] XML:', new XMLSerializer().serializeToString(doc));

        // Try every possible top-level wrapper element
        const data =
          doc.getElementsByTagName('E_DATA')[0] ||
          doc.getElementsByTagName('ET_DATA')[0] ||
          doc.getElementsByTagName('T_DATA')[0] ||
          doc.getElementsByTagName('E_OV')[0] ||
          doc.documentElement;

        const overview: FinanceOverview = {
          totalInvoiceAmount: tagVal(data as Element, 'TOTAL_INVOICE', 'INV_AMOUNT', 'FKSTO', 'NETWR', 'TOTAL_AMT', 'ZINVOICE'),
          totalPaid: tagVal(data as Element, 'TOTAL_PAID', 'PAID_AMOUNT', 'PAYED', 'ZPAID', 'TOTAL_PAY', 'BEZAHLT'),
          totalOutstanding: tagVal(data as Element, 'TOTAL_OUTSTANDING', 'OUT_AMOUNT', 'OFFEN', 'ZOPEN', 'OPENBETRAG', 'RESTBETRAG'),
          totalCredit: tagVal(data as Element, 'TOTAL_CREDIT', 'CREDIT_AMOUNT', 'ZCREDIT', 'GUTSCHR', 'CREDIT', 'HABENBETRAG'),
        };

        // If fi_ov returned nothing useful, throw to trigger fallback
        const hasData = Object.values(overview).some(v => v && v !== '0');
        if (!hasData) {
          throw new Error('FI_OV_EMPTY');
        }

        return overview;
      }),
      catchError(err => {
        console.warn('[ApiService.getFinanceOverview] fi_ov API failed, falling back to FI computation:', err.message);
        // Fallback: compute totals from the FI Invoices API
        return this.financialSvc.getFinancialData(kunnr).pipe(
          map(items => {
            const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
            const overdue = items.filter(i => parseInt(i.aging || '0') > 0)
                                 .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
            const paid = total - overdue;
            const credit = items
              .filter(i => (i.type || '').toUpperCase() === 'KG' || (i.type || '').toUpperCase() === 'G2')
              .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

            return {
              totalInvoiceAmount: total.toFixed(2),
              totalPaid: paid > 0 ? paid.toFixed(2) : '0.00',
              totalOutstanding: overdue.toFixed(2),
              totalCredit: credit.toFixed(2),
            } as FinanceOverview;
          })
        );
      })
    );
  }
}

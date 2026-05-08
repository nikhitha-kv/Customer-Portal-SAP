import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SoapService } from './soap.service';
import { FinancialItem } from '../models/invoice.model';

/** Get first non-empty text from tag list within an element */
function tagVal(el: Element, ...tags: string[]): string {
  for (const tag of tags) {
    const node = el.getElementsByTagName(tag)[0];
    if (node && node.textContent && node.textContent.trim()) {
      return node.textContent.trim();
    }
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class FinancialService {

  constructor(private soap: SoapService) {}

  getFinancialData(kunnr: string): Observable<FinancialItem[]> {
    return this.soap.call('financial', 'Z_CP_902095_FI_FM', {
      I_KUNNR: kunnr
    }).pipe(
      map(doc => {
        console.log('[FinancialService] Raw XML:', new XMLSerializer().serializeToString(doc));

        // Try multiple row tag names
        const rowTags = ['item', 'ET_FI', 'ET_INV', 'T_BSID', 'T_BSAD', 'INVOICE', 'row', 'record'];
        let rows: Element[] = [];

        for (const tag of rowTags) {
          const found = doc.getElementsByTagName(tag);
          if (found.length > 0) {
            rows = Array.from(found);
            console.log(`[FinancialService] Found ${rows.length} rows using <${tag}>`);
            break;
          }
        }

        if (rows.length === 0) {
          // Detect rows via BELNR / VBELN presence
          const anchors = doc.getElementsByTagName('BELNR');
          if (anchors.length > 0) {
            const parents = new Set<Element>();
            for (let i = 0; i < anchors.length; i++) {
              if (anchors[i].parentElement) parents.add(anchors[i].parentElement!);
            }
            rows = Array.from(parents);
          }
        }

        return rows
          .map(el => ({
            invoiceNumber: tagVal(el, 'BELNR', 'VBELN', 'XBLNR', 'INVOICE', 'BELNR_D', 'VBELN_VF'),
            billingDate:   tagVal(el, 'FKDAT', 'BLDAT', 'BUDAT', 'ERDAT', 'DATE', 'CPUDT'),
            dueDate:       tagVal(el, 'ZFBDT', 'FAEDT', 'DUE_DATE', 'DUEDT', 'NETDT', 'SKFBT'),
            aging:         tagVal(el, 'AGING', 'TAGE', 'DAYS', 'DUEDAYS', 'OVERDUE_DAYS'),
            amount:        tagVal(el, 'WRBTR', 'NETWR', 'DMBTR', 'AMOUNT', 'FWBAS', 'HWBAS', 'BRUTTO'),
            currency:      tagVal(el, 'WAERS', 'WAERK', 'CURRENCY', 'CURR', 'PRSDT'),
            type:          tagVal(el, 'DOC_TYPE', 'doc_type', 'DocType', 'FKART', 'fkart', 'FKAR', 'fkar', 'BLART', 'VBTYP', 'TYPE', 'BSTYP'),
          } as FinancialItem))
          .filter(i => i.invoiceNumber);
      })
    );
  }
}

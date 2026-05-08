import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SoapService } from './soap.service';
import { SalesOrder } from '../models/order.model';

/** Helper: get first non-empty text content from a list of tag names */
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
export class DashboardService {

  constructor(private soap: SoapService) {}

  getSalesOrders(kunnr: string): Observable<SalesOrder[]> {
    return this.soap.call('dashboard', 'Z_CP_902095_SD_FM', {
      I_KUNNR: kunnr
    }).pipe(
      map(doc => {
        console.log('[DashboardService] Raw XML:', new XMLSerializer().serializeToString(doc));
        const result: SalesOrder[] = [];

        // Try multiple possible row tag names SAP may return
        const rowTags = ['item', 'ET_SALES', 'T_VBAK', 'VBAK', 'SALES_ORDER', 'row', 'record'];
        let rows: HTMLCollectionOf<Element> | null = null;

        for (const tag of rowTags) {
          const found = doc.getElementsByTagName(tag);
          if (found.length > 0) {
            rows = found;
            console.log(`[DashboardService] Found ${found.length} rows using tag <${tag}>`);
            break;
          }
        }

        if (!rows || rows.length === 0) {
          // Last resort: find any elements with VBELN children
          const allVbeln = doc.getElementsByTagName('VBELN');
          console.warn('[DashboardService] No standard row tags found. VBELN count:', allVbeln.length);
          // Try to use parent elements of VBELN as rows
          if (allVbeln.length > 0) {
            const parents = new Set<Element>();
            for (let i = 0; i < allVbeln.length; i++) {
              const parent = allVbeln[i].parentElement;
              if (parent) parents.add(parent);
            }
            parents.forEach(parent => {
              const auart = tagVal(parent, 'AUART', 'AUART_ORIG', 'DOC_TYPE', 'BSART');
              result.push({
                vbeln: tagVal(parent, 'VBELN', 'VBELN_VA', 'AUFNR', 'ORDER_NO'),
                erdat: tagVal(parent, 'ERDAT', 'AUDAT', 'ERZEIT', 'DATE', 'BEDAT'),
                auart: auart,
                docType: this.resolveDocType(auart),
                netwr: tagVal(parent, 'NETWR', 'NETTO', 'KZWI1', 'NET_VALUE', 'AMOUNT', 'BRUTTO'),
                waerk: tagVal(parent, 'WAERK', 'PRSDT', 'CURRENCY', 'CURR', 'WAERS'),
              });
            });
            return result.filter(o => o.vbeln); // Remove empty rows
          }
          return [];
        }

        for (let i = 0; i < rows.length; i++) {
          const el = rows[i];
          const auart = tagVal(el, 'AUART', 'AUART_ORIG', 'DOC_TYPE', 'BSART', 'DOCCAT');
          const vbeln = tagVal(el, 'VBELN', 'VBELN_VA', 'AUFNR', 'ORDER_NO', 'BELNR');
          if (!vbeln && !auart) continue; // Skip truly empty items

          result.push({
            vbeln,
            erdat: tagVal(el, 'ERDAT', 'AUDAT', 'ERZEIT', 'DATE', 'BEDAT', 'ANGDT'),
            auart: auart,
            docType: this.resolveDocType(auart),
            netwr: tagVal(el, 'NETWR', 'NETTO', 'KZWI1', 'NET_VALUE', 'AMOUNT', 'BRUTTO', 'WRBTR'),
            waerk: tagVal(el, 'WAERK', 'CURRENCY', 'CURR', 'WAERS', 'PRSDT'),
          });
        }

        return result;
      })
    );
  }

  private resolveDocType(auart: string): string {
    const typeMap: Record<string, string> = {
      'IN':  'Inquiry',
      'AG':  'Quotation',
      'QT':  'Quotation',
      'OR':  'Sales Order',
      'TA':  'Standard Order',
      'RE':  'Returns',
      'ZOR': 'Sales Order',
      'ZTA': 'Standard Order',
    };
    const u = (auart || '').toUpperCase().trim();
    if (!u) return 'Sales Order';
    if (u.includes('INQUIRY') || u === 'IN') return 'Inquiry';
    if (u.includes('QUOT'))  return 'Quotation';
    if (u.includes('RETURN') || u === 'RE') return 'Returns';
    if (u.includes('ORDER') || u.includes('SALES') || u.includes('ODDE')) return 'Sales Order';
    return typeMap[u] || auart || 'Sales Order';
  }
}

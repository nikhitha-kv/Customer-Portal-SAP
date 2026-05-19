import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SoapService } from './soap.service';
import { SalesOrder, SalesOrderItem } from '../models/order.model';

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

        const parseRow = (el: Element) => {
          const auart = tagVal(el, 'AUART', 'auart', 'Auart', 'AUART_ORIG', 'DOC_TYPE', 'BSART', 'DOCCAT');
          const vbeln = tagVal(el, 'VBELN', 'vbeln', 'Vbeln', 'VBELN_VA', 'AUFNR', 'ORDER_NO', 'BELNR');
          if (!vbeln && !auart) return null;

          const erdat = tagVal(el, 'ERDAT', 'erdat', 'Erdat', 'AUDAT', 'ERZEIT', 'DATE', 'BEDAT', 'ANGDT');
          const netwr = tagVal(el, 'NETWR', 'netwr', 'Netwr', 'NETTO', 'KZWI1', 'NET_VALUE', 'AMOUNT', 'BRUTTO', 'WRBTR');
          const waerk = tagVal(el, 'WAERK', 'waerk', 'Waerk', 'CURRENCY', 'CURR', 'WAERS', 'PRSDT');

          // Item level fields - case-insensitive
          const matnr = tagVal(el, 'MATNR', 'matnr', 'Matnr', 'MATNR_VBAP', 'MAT_NR', 'MATERIAL', 'material');
          const itemDesc = tagVal(el, 'ITEM_DESC', 'item_desc', 'itemDesc', 'ARKTX', 'arktx', 'Arktx', 'MAKTX', 'maktx');
          const qty = tagVal(el, 'QTY', 'qty', 'Qty', 'KWMENG', 'kwmeng', 'QUANTITY', 'quantity', 'MENGE', 'menge');
          const vrkme = tagVal(el, 'VRKME', 'vrkme', 'Vrkme', 'UNIT', 'unit', 'MEINS', 'meins', 'SALES_UNIT', 'sales_unit');

          return {
            vbeln,
            erdat,
            auart,
            docType: this.resolveDocType(auart),
            netwr,
            waerk,
            item: (matnr || itemDesc || qty || vrkme) ? { matnr, itemDesc, qty, vrkme } : null
          };
        };

        const processRecords = (records: Array<any>) => {
          const ordersMap = new Map<string, SalesOrder>();

          for (const rec of records) {
            if (!rec || !rec.vbeln) continue;

            let order = ordersMap.get(rec.vbeln);
            if (!order) {
              order = {
                vbeln: rec.vbeln,
                erdat: rec.erdat,
                auart: rec.auart,
                docType: rec.docType,
                netwr: rec.netwr,
                waerk: rec.waerk,
                items: []
              };
              ordersMap.set(rec.vbeln, order);
            }

            if (rec.item) {
              const alreadyExists = order.items.some(
                i => i.matnr === rec.item.matnr &&
                     i.itemDesc === rec.item.itemDesc &&
                     i.qty === rec.item.qty
              );
              if (!alreadyExists) {
                order.items.push(rec.item);
              }
            }
          }

          return Array.from(ordersMap.values());
        };

        const parsedRows: any[] = [];

        if (!rows || rows.length === 0) {
          const allVbeln = doc.getElementsByTagName('VBELN');
          console.warn('[DashboardService] No standard row tags found. VBELN count:', allVbeln.length);
          if (allVbeln.length > 0) {
            const parents = new Set<Element>();
            for (let i = 0; i < allVbeln.length; i++) {
              const parent = allVbeln[i].parentElement;
              if (parent) parents.add(parent);
            }
            parents.forEach(parent => {
              const parsed = parseRow(parent);
              if (parsed) parsedRows.push(parsed);
            });
          }
        } else {
          for (let i = 0; i < rows.length; i++) {
            const parsed = parseRow(rows[i]);
            if (parsed) parsedRows.push(parsed);
          }
        }

        return processRecords(parsedRows);
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

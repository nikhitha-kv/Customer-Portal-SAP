import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialService } from '../../../core/services/financial.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinancialItem } from '../../../core/models/invoice.model';

@Component({
  selector: 'app-credit-debit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Credit / <span class="accent">Debit Memos</span></h1>
          <p class="page-desc">Review all credit and debit adjustments to your account</p>
        </div>
        <button class="refresh-btn" (click)="loadData()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <div class="sk-wrap" *ngIf="loading()">
        <div class="sk-row" *ngFor="let x of [1,2,3,4]">
          <div class="sk w-20"></div><div class="sk w-15"></div><div class="sk w-15"></div><div class="sk w-15"></div>
        </div>
      </div>

      <div class="err-box" *ngIf="error() && !loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div><strong>Failed to load records</strong><p>{{ friendly(error()) }}</p></div>
        <button class="retry" (click)="loadData()">Retry</button>
      </div>

      <!-- Info if no filtered CR/DR records -->
      <div class="info-banner" *ngIf="!loading() && !error() && allItems().length > 0 && items().length === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        No credit or debit memo document types detected in the current invoice data. All {{ allItems().length }} records are shown below.
      </div>

      <div class="table-card" *ngIf="!loading() && !error()">
        <div class="tw">
          <table class="dt" *ngIf="items().length > 0">
            <thead>
              <tr>
                <th>Document Number</th>
                <th>Date</th>
                <th>Document Type</th>
                <th>Amount</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let i of items()">
                <td><span class="mono">{{ i.invoiceNumber || '—' }}</span></td>
                <td>{{ fmtDate(i.billingDate) }}</td>
                <td><span class="badge" [class]="typeCls(i.type || '')">{{ typeDisplay(i.type) }}</span></td>
                <td><strong>{{ fmtAmt(i.amount) }}</strong></td>
                <td><span class="curr">{{ i.currency || '—' }}</span></td>
              </tr>
            </tbody>
          </table>
          <div class="empty" *ngIf="items().length === 0 && allItems().length === 0">
            <p>No records found.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:20px}.page-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}.page-title{font-size:24px;font-weight:700;margin:0 0 4px}.accent{color:var(--accent-primary)}.page-desc{font-size:13px;color:var(--text-secondary);margin:0}
    .refresh-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;transition:all 0.2s}.refresh-btn svg{width:14px;height:14px}.refresh-btn:hover:not(:disabled){border-color:var(--accent-primary);color:var(--accent-primary)}.refresh-btn:disabled{opacity:0.5;cursor:not-allowed}
    .sk-wrap{display:flex;flex-direction:column;gap:8px}.sk-row{display:flex;gap:12px;background:var(--surface-glass);padding:16px 20px;border-radius:12px;border:1px solid var(--surface-border)}.sk{height:14px;background:rgba(255,255,255,0.05);border-radius:4px;animation:shimmer 1.5s infinite}.w-20{width:20%}.w-15{width:15%}
    .err-box{display:flex;align-items:flex-start;gap:16px;padding:20px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px}.err-box svg{width:22px;height:22px;color:#f87171;flex-shrink:0;margin-top:2px}.err-box strong{display:block;color:#fca5a5;margin-bottom:4px}.err-box p{margin:0;font-size:13px;color:var(--text-secondary)}.retry{margin-left:auto;padding:8px 14px;background:var(--accent-primary);color:white;border:none;border-radius:8px;cursor:pointer}
    .info-banner{display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:10px;font-size:13px;color:#22d3ee}.info-banner svg{width:18px;height:18px;flex-shrink:0}
    .table-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;overflow:hidden}.tw{overflow-x:auto}.dt{width:100%;border-collapse:collapse}.dt th{padding:10px 18px;background:rgba(0,0,0,0.15);color:var(--text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid var(--surface-border)}.dt td{padding:12px 18px;font-size:13px;color:var(--text-primary);border-bottom:1px solid var(--surface-border)}.dt tr:last-child td{border-bottom:none}.dt tbody tr:hover{background:rgba(255,255,255,0.03)}
    .mono{font-family:monospace;font-weight:600;letter-spacing:0.04em}.curr{font-size:12px;font-weight:600;color:var(--text-secondary)}
    .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600}
    .badge-c{background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
    .badge-d{background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
    .badge-n{background:rgba(255,255,255,0.07);color:var(--text-secondary);border:1px solid var(--surface-border)}
    .empty{padding:40px;text-align:center;color:var(--text-secondary);font-size:14px}
    @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
  `]
})
export class CreditDebitComponent implements OnInit {
  private financialSvc = inject(FinancialService);
  private auth = inject(AuthService);

  allItems = signal<FinancialItem[]>([]);
  items = signal<FinancialItem[]>([]);
  loading = signal(true);
  error = signal('');

  // SAP document types that represent credit or debit memos
  private readonly CR_DR_TYPES = new Set(['G2', 'L2', 'KG', 'DG']);

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true); this.error.set('');
    this.financialSvc.getFinancialData(this.auth.getCurrentKunnr()).subscribe({
      next: data => {
        this.allItems.set(data);
        console.log('FI DATA:', data);
        // Filter by document type
        const filtered = data.filter(item => {
          const type = (item.type || '').toUpperCase();
          return (
            type.includes('CREDIT') ||
            type.includes('DEBIT')
          );
        });
        this.items.set(filtered);
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(e?.message||'Error'); this.loading.set(false); }
    });
  }

  fmtDate(d: string): string {
    if (!d) return '—';
    if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    return d;
  }

  fmtAmt(v: string): string {
    const n = parseFloat(v);
    return isNaN(n) ? (v||'—') : new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  }

  typeCls(t: string): string {
    const u = (t || '').toUpperCase();
    if (u.includes('CREDIT') || u === 'KG' || u === 'G2') return 'badge badge-c';
    if (u.includes('DEBIT') || u === 'DZ' || u === 'L2') return 'badge badge-d';
    return 'badge badge-n';
  }

  typeDisplay(t?: string): string {
    if (!t) return '—';
    const u = t.toUpperCase().trim();
    if (u === 'G2' || u === 'KG') return 'Credit Memo';
    if (u === 'L2' || u === 'DZ') return 'Debit Memo';
    if (u === 'F2') return 'Invoice';
    return t;
  }

  friendly(m: string): string {
    if (!m) return 'Unknown error';
    if (m.toLowerCase().includes('web service')) return 'SAP backend error. Please retry or contact support.';
    return m.length>120 ? m.slice(0,120)+'…' : m;
  }
}

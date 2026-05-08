import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentItem } from '../../../core/models/api.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Payment <span class="accent">History</span></h1>
          <p class="page-desc">Track all received and outstanding payments</p>
        </div>
        <button class="refresh-btn" (click)="loadData()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <div class="sk-wrap" *ngIf="loading()">
        <div class="sk-row" *ngFor="let x of [1,2,3,4,5]">
          <div class="sk w-20"></div><div class="sk w-15"></div><div class="sk w-20"></div><div class="sk w-15"></div>
        </div>
      </div>

      <div class="err-box" *ngIf="error() && !loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div><strong>Failed to load payments</strong><p>{{ friendly(error()) }}</p></div>
        <button class="retry" (click)="loadData()">Retry</button>
      </div>

      <div class="table-card" *ngIf="!loading() && !error()">
        <!-- Summary strip -->
        <div class="summary-strip" *ngIf="items().length > 0">
          <div class="summ-item">
            <span class="summ-label">Total Records</span>
            <span class="summ-val">{{ items().length }}</span>
          </div>
          <div class="summ-sep"></div>
          <div class="summ-item">
            <span class="summ-label">Total Amount</span>
            <span class="summ-val">{{ totalAmt() }}</span>
          </div>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search payments..." [(ngModel)]="q" (ngModelChange)="filter()"/>
            <button class="x-btn" *ngIf="q" (click)="q=''; filter()">✕</button>
          </div>
          <span class="count">Showing {{ pageStart() }} - {{ pageEnd() }} of {{ shown().length }} {{ q ? '(filtered)' : 'records' }}</span>
        </div>

        <div class="tw">
          <table class="dt" *ngIf="page().length > 0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of page()">
                <td>{{ fmtDate(p.date) }}</td>
                <td><strong>{{ fmtAmt(p.amount) }}</strong></td>
                <td><span class="badge" [class]="stCls(p.status)">{{ p.status || 'Open' }}</span></td>
              </tr>
            </tbody>
          </table>
          <div class="empty" *ngIf="page().length === 0">
            <p>{{ q ? 'No results match your search.' : 'No payment records found.' }}</p>
          </div>
        </div>
        <div class="pager" *ngIf="pages() > 1">
          <button class="pb" [disabled]="pgNum() === 1" (click)="setPg(pgNum()-1)">‹</button>
          <span>Page {{ pgNum() }} / {{ pages() }}</span>
          <button class="pb" [disabled]="pgNum() === pages()" (click)="setPg(pgNum()+1)">›</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:20px}.page-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}.page-title{font-size:24px;font-weight:700;margin:0 0 4px}.accent{color:var(--accent-primary)}.page-desc{font-size:13px;color:var(--text-secondary);margin:0}
    .refresh-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;transition:all 0.2s}.refresh-btn svg{width:14px;height:14px}.refresh-btn:hover:not(:disabled){border-color:var(--accent-primary);color:var(--accent-primary)}.refresh-btn:disabled{opacity:0.5;cursor:not-allowed}
    .sk-wrap{display:flex;flex-direction:column;gap:8px}.sk-row{display:flex;gap:12px;background:var(--surface-glass);padding:16px 20px;border-radius:12px;border:1px solid var(--surface-border)}.sk{height:14px;background:rgba(255,255,255,0.05);border-radius:4px;animation:shimmer 1.5s infinite}.w-20{width:20%}.w-15{width:15%}
    .err-box{display:flex;align-items:flex-start;gap:16px;padding:20px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px}.err-box svg{width:22px;height:22px;color:#f87171;flex-shrink:0;margin-top:2px}.err-box strong{display:block;color:#fca5a5;margin-bottom:4px}.err-box p{margin:0;font-size:13px;color:var(--text-secondary)}.retry{margin-left:auto;padding:8px 14px;background:var(--accent-primary);color:white;border:none;border-radius:8px;cursor:pointer}
    .table-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;overflow:hidden}
    .summary-strip{display:flex;align-items:center;gap:20px;padding:16px 20px;background:rgba(0,0,0,0.15);border-bottom:1px solid var(--surface-border)}
    .summ-item{display:flex;flex-direction:column;gap:2px}.summ-label{font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em}.summ-val{font-size:18px;font-weight:700;color:var(--text-primary)}
    .summ-sep{width:1px;height:32px;background:var(--surface-border)}
    .toolbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--surface-border);flex-wrap:wrap;gap:10px}.search-box{position:relative;display:flex;align-items:center}.search-box svg{position:absolute;left:10px;width:14px;height:14px;color:var(--text-muted)}.search-box input{padding:7px 30px 7px 32px;background:rgba(0,0,0,0.2);border:1px solid var(--surface-border);border-radius:8px;color:var(--text-primary);font-size:13px;outline:none;width:220px;transition:border-color 0.2s}.search-box input:focus{border-color:var(--accent-primary)}.x-btn{position:absolute;right:8px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px}.count{font-size:12px;color:var(--text-secondary)}
    .tw{overflow-x:auto}.dt{width:100%;border-collapse:collapse}.dt th{padding:10px 18px;background:rgba(0,0,0,0.15);color:var(--text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid var(--surface-border)}.dt td{padding:12px 18px;font-size:13px;color:var(--text-primary);border-bottom:1px solid var(--surface-border)}.dt tr:last-child td{border-bottom:none}.dt tbody tr:hover{background:rgba(255,255,255,0.03)}
    .mono{font-family:monospace;font-weight:600;letter-spacing:0.04em}.badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600}.badge-g{background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3)}.badge-o{background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}.badge-r{background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)}.badge-d{background:rgba(255,255,255,0.07);color:var(--text-secondary);border:1px solid var(--surface-border)}
    .empty{padding:40px;text-align:center;color:var(--text-secondary);font-size:14px}.pager{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;border-top:1px solid var(--surface-border);font-size:13px;color:var(--text-secondary)}.pb{width:30px;height:30px;border:1px solid var(--surface-border);border-radius:7px;background:rgba(0,0,0,0.2);color:var(--text-primary);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center}.pb:hover:not(:disabled){border-color:var(--accent-primary);background:var(--accent-primary);color:white}.pb:disabled{opacity:0.3;cursor:not-allowed}
    @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
  `]
})
export class PaymentsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  items = signal<PaymentItem[]>([]);
  loading = signal(true);
  error = signal('');
  q = '';
  shown = signal<PaymentItem[]>([]);
  pgNum = signal(1);
  readonly sz = 15;

  pageStart = computed(() => this.shown().length === 0 ? 0 : (this.pgNum()-1)*this.sz + 1);
  pageEnd = computed(() => Math.min(this.pgNum()*this.sz, this.shown().length));
  page = computed(() => { const s=(this.pgNum()-1)*this.sz; return this.shown().slice(s,s+this.sz); });
  pages = computed(() => Math.ceil(this.shown().length/this.sz)||1);

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true); this.error.set('');
    this.api.getPayments(this.auth.getCurrentKunnr()).subscribe({
      next: d => { this.items.set(d); this.filter(); this.loading.set(false); },
      error: (e:any) => { this.error.set(e?.message||'Error'); this.loading.set(false); }
    });
  }

  filter() {
    const t = this.q.toLowerCase();
    this.shown.set(!t ? this.items() : this.items().filter(i =>
      (i.docNumber||'').toLowerCase().includes(t) ||
      (i.date||'').toLowerCase().includes(t) ||
      (i.amount||'').toLowerCase().includes(t) ||
      (i.status||'').toLowerCase().includes(t)
    ));
    this.pgNum.set(1);
  }

  setPg(n:number) { this.pgNum.set(n); }

  totalAmt(): string {
    const s = this.items().reduce((acc,i)=>acc+(parseFloat(i.amount)||0),0);
    return new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(s);
  }

  fmtDate(d:string): string {
    if(!d) return '—';
    if(/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    return d;
  }

  fmtAmt(v:string): string {
    const n=parseFloat(v);
    return isNaN(n)?(v||'—'):new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  }

  stCls(s:string): string {
    const u=(s||'').toUpperCase();
    if(u.includes('PAID')||u==='ZA'||u==='CLEARED') return 'badge badge-g';
    if(u.includes('OPEN')||u==='OP') return 'badge badge-o';
    if(u.includes('OVER')||u.includes('DUE')) return 'badge badge-r';
    return 'badge badge-d';
  }

  friendly(m:string): string {
    if(!m) return 'Unknown error';
    if(m.toLowerCase().includes('web service')) return 'SAP backend error. Please retry or contact support.';
    return m.length>120?m.slice(0,120)+'…':m;
  }
}

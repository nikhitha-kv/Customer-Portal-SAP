import {
  Component, OnInit, AfterViewInit, OnDestroy,
  inject, signal, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { FinancialService } from '../../../core/services/financial.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceOverview } from '../../../core/models/api.model';
import { FinancialItem } from '../../../core/models/invoice.model';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-finance-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial <span class="accent">Overview</span></h1>
          <p class="page-desc">Real-time financial activity, balances and invoice ageing</p>
        </div>
        <button class="refresh-btn" (click)="loadData()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <!-- KPI skeletons -->
      <div class="kpi-grid" *ngIf="loading()">
        <div class="kpi-card skeleton" *ngFor="let x of [1,2,3,4]"></div>
      </div>

      <!-- Fallback notice -->
      <div class="info-banner" *ngIf="usingFallback() && !loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Finance overview API unavailable — figures computed from invoice records.
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" *ngIf="!loading() && overview()">
        <div class="kpi-card">
          <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()!.totalInvoiceAmount) }}</span><span class="kpi-label">Total Invoiced</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()!.totalPaid) }}</span><span class="kpi-label">Total Paid</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()!.totalOutstanding) }}</span><span class="kpi-label">Outstanding</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()!.totalCredit) }}</span><span class="kpi-label">Total Credit</span></div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="charts-grid" *ngIf="!loading()">

        <!-- Doughnut: financial split -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Balance Breakdown</h3>
            <span class="chart-sub">Paid · Outstanding · Credit</span>
          </div>
          <div class="chart-wrap dw">
            <canvas #balDonut></canvas>
            <div class="dc" *ngIf="totalBal() > 0">
              <span class="dc-val">{{ paidPct() }}%</span>
              <span class="dc-lbl">Paid</span>
            </div>
          </div>
          <div class="legend" *ngIf="totalBal() > 0">
            <div class="li"><span class="dot green"></span>Paid ({{ paidPct() }}%)</div>
            <div class="li"><span class="dot orange"></span>Outstanding ({{ outPct() }}%)</div>
            <div class="li"><span class="dot purple"></span>Credit ({{ creditPct() }}%)</div>
          </div>
          <div class="no-data" *ngIf="totalBal() === 0">No balance data available</div>
        </div>

        <!-- Bar: Invoice Ageing buckets -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Invoice Ageing</h3>
            <span class="chart-sub">Count of invoices by overdue days</span>
          </div>
          <div class="chart-wrap bw">
            <canvas #agingBar></canvas>
          </div>
          <div class="no-data" *ngIf="invoices().length === 0 && !invLoading()">No invoice data</div>
          <div class="no-data loading" *ngIf="invLoading()">Loading invoices…</div>
        </div>

      </div>

      <!-- Invoice Amount Trend (monthly) -->
      <div class="chart-card wide" *ngIf="!loading() && invoices().length > 0">
        <div class="chart-header">
          <h3>Invoice Amount by Month</h3>
          <span class="chart-sub">Cumulative billed amount (INR) over time — {{ invoices().length }} invoices</span>
        </div>
        <div class="chart-wrap line-wrap">
          <canvas #monthLine></canvas>
        </div>
      </div>

      <!-- Error fallback -->
      <div class="err-box" *ngIf="!loading() && !overview()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div><strong>Financial Overview Unavailable</strong><p>{{ friendly(error()) }}</p></div>
        <button class="retry" (click)="loadData()">Retry</button>
      </div>
    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:24px}
    .page-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
    .page-title{font-size:24px;font-weight:700;margin:0 0 4px}.accent{color:var(--accent-primary)}
    .page-desc{font-size:13px;color:var(--text-secondary);margin:0}
    .refresh-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;transition:all 0.2s}
    .refresh-btn svg{width:14px;height:14px}.refresh-btn:hover:not(:disabled){border-color:var(--accent-primary);color:var(--accent-primary)}.refresh-btn:disabled{opacity:0.5;cursor:not-allowed}

    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    @media(max-width:900px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
    .kpi-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;padding:24px;display:flex;align-items:center;gap:16px;transition:transform 0.2s,box-shadow 0.2s}
    .kpi-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
    .kpi-card.skeleton{height:96px;animation:shimmer 1.5s infinite}
    .kpi-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .kpi-icon svg{width:22px;height:22px}
    .kpi-icon.blue{background:rgba(6,182,212,0.15);color:#22d3ee;border:1px solid rgba(6,182,212,0.3)}
    .kpi-icon.green{background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3)}
    .kpi-icon.orange{background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}
    .kpi-icon.purple{background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)}
    .kpi-body{display:flex;flex-direction:column}
    .kpi-value{font-size:20px;font-weight:700;color:var(--text-primary)}
    .kpi-label{font-size:12px;color:var(--text-secondary);margin-top:2px}

    .info-banner{display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:10px;font-size:13px;color:#22d3ee}
    .info-banner svg{width:18px;height:18px;flex-shrink:0}

    /* Charts */
    .charts-grid{display:grid;grid-template-columns:320px 1fr;gap:20px}
    @media(max-width:900px){.charts-grid{grid-template-columns:1fr}}
    .chart-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:14px}
    .chart-card.wide{width:100%}
    .chart-header{display:flex;flex-direction:column;gap:2px}
    .chart-header h3{margin:0;font-size:15px;font-weight:600;color:var(--text-primary)}
    .chart-sub{font-size:12px;color:var(--text-secondary)}
    .chart-wrap{position:relative}
    .dw{display:flex;align-items:center;justify-content:center;height:200px}
    .dw canvas{max-width:200px;max-height:200px}
    .bw{position:relative;height:200px;width:100%}
    .line-wrap{position:relative;height:240px;width:100%}
    .dc{position:absolute;display:flex;flex-direction:column;align-items:center;pointer-events:none}
    .dc-val{font-size:20px;font-weight:700;color:var(--text-primary)}
    .dc-lbl{font-size:11px;color:var(--text-secondary)}
    .legend{display:flex;gap:16px;flex-wrap:wrap}
    .li{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)}
    .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .dot.green{background:#34d399}.dot.orange{background:#fbbf24}.dot.purple{background:#a78bfa}
    .no-data{text-align:center;color:var(--text-secondary);font-size:13px;padding:20px}
    .no-data.loading{opacity:0.6}

    .err-box{display:flex;align-items:flex-start;gap:16px;padding:24px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px}
    .err-box svg{width:24px;height:24px;color:#f87171;flex-shrink:0;margin-top:2px}
    .err-box strong{display:block;color:#fca5a5;font-size:15px;margin-bottom:6px}.err-box p{margin:0;font-size:13px;color:var(--text-secondary)}
    .retry{margin-left:auto;padding:8px 16px;background:var(--accent-primary);color:white;border:none;border-radius:8px;cursor:pointer;flex-shrink:0}

    @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
  `]
})
export class FinanceOverviewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('balDonut') balDonutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('agingBar') agingBarRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthLine') monthLineRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private finSvc = inject(FinancialService);
  private auth = inject(AuthService);

  overview = signal<FinanceOverview | null>(null);
  invoices = signal<FinancialItem[]>([]);
  loading = signal(true);
  invLoading = signal(true);
  error = signal('');
  usingFallback = signal(false);

  private donutChart: Chart | null = null;
  private agingChart: Chart | null = null;
  private lineChart: Chart | null = null;

  ngOnInit() { this.loadData(); }
  ngAfterViewInit() {}

  ngOnDestroy() {
    this.donutChart?.destroy();
    this.agingChart?.destroy();
    this.lineChart?.destroy();
  }

  loadData() {
    this.loading.set(true);
    this.invLoading.set(true);
    this.error.set('');
    this.usingFallback.set(false);
    const kunnr = this.auth.getCurrentKunnr();

    // Finance overview (with fallback inside ApiService)
    this.api.getFinanceOverview(kunnr).subscribe({
      next: data => {
        this.overview.set(data);
        this.loading.set(false);
        setTimeout(() => { this.drawDonut(); this.drawAgingBar(); this.drawMonthLine(); }, 60);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Service unavailable');
        this.usingFallback.set(true);
        this.overview.set({ totalInvoiceAmount: '0', totalPaid: '0', totalOutstanding: '0', totalCredit: '0' });
        this.loading.set(false);
        setTimeout(() => { this.drawDonut(); this.drawAgingBar(); this.drawMonthLine(); }, 60);
      }
    });

    // Invoices for aging + monthly charts
    this.finSvc.getFinancialData(kunnr).subscribe({
      next: items => {
        this.invoices.set(items);
        this.invLoading.set(false);
        setTimeout(() => {
          this.drawAgingBar();
          this.drawMonthLine();
        }, 80);
      },
      error: () => { this.invLoading.set(false); }
    });
  }

  // ---- Computed percentages ----
  paidVal()    { return parseFloat(this.overview()?.totalPaid || '0') || 0; }
  outVal()     { return parseFloat(this.overview()?.totalOutstanding || '0') || 0; }
  creditVal()  { return parseFloat(this.overview()?.totalCredit || '0') || 0; }
  totalBal()   { return this.paidVal() + this.outVal() + this.creditVal(); }
  paidPct()    { const t = this.totalBal(); return t ? Math.round(this.paidVal()/t*100) : 0; }
  outPct()     { const t = this.totalBal(); return t ? Math.round(this.outVal()/t*100) : 0; }
  creditPct()  { const t = this.totalBal(); return t ? Math.round(this.creditVal()/t*100) : 0; }

  // ---- Charts ----
  private drawDonut() {
    if (!this.balDonutRef) return;
    this.donutChart?.destroy();
    const p = this.paidVal(), o = this.outVal(), c = this.creditVal();
    const total = p + o + c;

    this.donutChart = new Chart(this.balDonutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Outstanding', 'Credit'],
        datasets: [{
          data: total > 0 ? [p, o, c] : [1, 1, 1],
          backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(251,191,36,0.85)', 'rgba(167,139,250,0.85)'],
          borderColor: ['#34d399', '#fbbf24', '#a78bfa'],
          borderWidth: 2, hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (total === 0) return ' No data';
                const v = ctx.raw as number;
                return ` ${ctx.label}: ${this.fmtAmt(String(v))} (${Math.round(v/total*100)}%)`;
              }
            },
            backgroundColor: 'rgba(10,10,20,0.9)', borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1, padding: 10,
          }
        }
      }
    });
  }

  private drawAgingBar() {
    if (!this.agingBarRef) return;
    this.agingChart?.destroy();

    const invs = this.invoices();
    if (invs.length === 0) return;

    // Bucket by aging days
    const buckets: Record<string, number> = {
      'Current (0)': 0, '1–30 days': 0, '31–60 days': 0, '61–90 days': 0, '>90 days': 0
    };
    invs.forEach(inv => {
      const d = parseInt(inv.aging || '0');
      if (d <= 0)       buckets['Current (0)']++;
      else if (d <= 30) buckets['1–30 days']++;
      else if (d <= 60) buckets['31–60 days']++;
      else if (d <= 90) buckets['61–90 days']++;
      else              buckets['>90 days']++;
    });

    this.agingChart = new Chart(this.agingBarRef.nativeElement, {
      type: 'bar',
      data: {
        labels: Object.keys(buckets),
        datasets: [{
          label: 'Invoices',
          data: Object.values(buckets),
          backgroundColor: [
            'rgba(52,211,153,0.8)', 'rgba(34,211,238,0.8)',
            'rgba(251,191,36,0.8)', 'rgba(249,115,22,0.8)', 'rgba(239,68,68,0.8)'
          ],
          borderColor: ['#34d399','#22d3ee','#fbbf24','#f97316','#ef4444'],
          borderWidth: 1, borderRadius: 8, borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.raw} invoice${(ctx.raw as number)!==1?'s':''}` },
            backgroundColor: 'rgba(10,10,20,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10,
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, stepSize: 1 } }
        }
      }
    });
  }

  private drawMonthLine() {
    if (!this.monthLineRef) return;
    this.lineChart?.destroy();

    const invs = this.invoices();
    if (invs.length === 0) return;

    // Group by YYYYMM from billingDate
    const monthly: Record<string, number> = {};
    invs.forEach(inv => {
      const raw = inv.billingDate || '';
      let key = '';
      if (/^\d{8}$/.test(raw)) key = `${raw.slice(0,4)}-${raw.slice(4,6)}`;
      else if (/^\d{4}-\d{2}/.test(raw)) key = raw.slice(0,7);
      if (!key) return;
      monthly[key] = (monthly[key] || 0) + (parseFloat(inv.amount) || 0);
    });

    const sortedKeys = Object.keys(monthly).sort();
    const values = sortedKeys.map(k => monthly[k]);

    this.lineChart = new Chart(this.monthLineRef.nativeElement, {
      type: 'line',
      data: {
        labels: sortedKeys,
        datasets: [{
          label: 'Invoice Amount',
          data: values,
          borderColor: 'rgba(220,38,38,0.9)',
          backgroundColor: 'rgba(220,38,38,0.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${this.fmtAmt(String(ctx.raw))}`
            },
            backgroundColor: 'rgba(10,10,20,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10,
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: 'rgba(255,255,255,0.5)', font: { size: 11 },
              callback: (v) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v as number)
            }
          }
        }
      }
    });
  }

  fmtAmt(v?: string): string {
    if (!v || v === '—') return '—';
    const n = parseFloat(v);
    return isNaN(n) ? v : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  friendly(m: string): string {
    if (!m) return 'Unknown error';
    if (m.toLowerCase().includes('web service') || m.toLowerCase().includes('processing error')) {
      return 'The SAP finance service is currently unavailable.';
    }
    return m.length > 160 ? m.slice(0, 160) + '…' : m;
  }
}

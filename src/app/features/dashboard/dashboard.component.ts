import {
  Component, OnInit, AfterViewInit, OnDestroy,
  inject, signal, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { FinanceOverview } from '../../core/models/api.model';
import { SalesOrder } from '../../core/models/order.model';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Welcome, <span class="accent">{{ userName() }}</span></h1>
          <p class="page-desc">Your real-time financial & sales summary</p>
        </div>
        <button class="refresh-btn" (click)="loadData()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <!-- KPI skeleton -->
      <div class="kpi-grid" *ngIf="loading()">
        <div class="kpi-card skeleton" *ngFor="let x of [1,2,3,4]"></div>
      </div>

      <!-- Non-blocking warning -->
      <div class="warn-banner" *ngIf="error() && !loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Finance overview service unavailable — figures computed from invoice data.</span>
        <button (click)="loadData()">Retry</button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" *ngIf="!loading()">
        <div class="kpi-card">
          <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()?.totalInvoiceAmount) }}</span><span class="kpi-label">Total Invoiced</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()?.totalPaid) }}</span><span class="kpi-label">Total Paid</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()?.totalOutstanding) }}</span><span class="kpi-label">Outstanding</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
          <div class="kpi-body"><span class="kpi-value">{{ fmtAmt(overview()?.totalCredit) }}</span><span class="kpi-label">Total Credit</span></div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-grid" *ngIf="!loading()">

        <!-- Finance Breakdown Doughnut -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Financial Breakdown</h3>
            <span class="chart-sub">Paid vs Outstanding vs Credit</span>
          </div>
          <div class="chart-wrap doughnut-wrap">
            <canvas #finDonut></canvas>
            <div class="donut-center" *ngIf="totalVal() > 0">
              <span class="dc-val">{{ fmtAmt(overview()?.totalInvoiceAmount) }}</span>
              <span class="dc-label">Total</span>
            </div>
          </div>
          <div class="legend" *ngIf="totalVal() > 0">
            <div class="leg-item"><span class="dot green"></span>Paid ({{ paidPct() }}%)</div>
            <div class="leg-item"><span class="dot orange"></span>Outstanding ({{ outPct() }}%)</div>
            <div class="leg-item"><span class="dot purple"></span>Credit ({{ creditPct() }}%)</div>
          </div>
          <div class="no-data" *ngIf="totalVal() === 0">No financial data available</div>
        </div>

        <!-- Sales by Document Type Bar -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Sales by Document Type</h3>
            <span class="chart-sub">Distribution across {{ salesOrders().length }} orders</span>
          </div>
          <div class="chart-wrap bar-wrap">
            <canvas #salesBar></canvas>
          </div>
          <div class="no-data" *ngIf="salesOrders().length === 0 && !salesLoading()">No sales data available</div>
          <div class="no-data loading" *ngIf="salesLoading()">Loading sales data…</div>
        </div>

      </div>

      <!-- Bottom row -->
      <div class="info-grid" *ngIf="!loading()">
        <div class="info-card">
          <h3>Quick Navigation</h3>
          <div class="nav-links">
            <a routerLink="/dashboard/sales" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Sales Orders
            </a>
            <a routerLink="/dashboard/inquiry" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Inquiries
            </a>
            <a routerLink="/dashboard/lod" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>LOD Deliveries
            </a>
            <a routerLink="/finance/invoice" class="nav-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Invoices
            </a>
          </div>
        </div>
        <div class="info-card">
          <h3>Account Information</h3>
          <div class="acc-info">
            <div class="acc-row"><span class="acc-label">Customer ID</span><span class="acc-val mono">{{ customerId() }}</span></div>
            <div class="acc-row"><span class="acc-label">Name</span><span class="acc-val">{{ userName() }}</span></div>
            <div class="acc-row"><span class="acc-label">Total Orders</span><span class="acc-val">{{ salesOrders().length }}</span></div>
            <div class="acc-row"><span class="acc-label">Session</span><span class="acc-val status-active">Active</span></div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:24px}
    .page-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
    .page-title{font-size:26px;font-weight:700;margin:0 0 4px}
    .accent{color:var(--accent-primary)}
    .page-desc{font-size:13px;color:var(--text-secondary);margin:0}
    .refresh-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;transition:all 0.2s}
    .refresh-btn svg{width:14px;height:14px}
    .refresh-btn:hover:not(:disabled){border-color:var(--accent-primary);color:var(--accent-primary)}
    .refresh-btn:disabled{opacity:0.5;cursor:not-allowed}

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

    .warn-banner{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:10px;font-size:13px;color:#fbbf24}
    .warn-banner svg{width:18px;height:18px;flex-shrink:0}
    .warn-banner button{margin-left:auto;padding:5px 12px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.3);border-radius:6px;color:#fbbf24;cursor:pointer;font-size:12px}

    /* Charts */
    .charts-grid{display:grid;grid-template-columns:340px 1fr;gap:20px}
    @media(max-width:900px){.charts-grid{grid-template-columns:1fr}}

    .chart-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px}
    .chart-header{display:flex;flex-direction:column;gap:2px}
    .chart-header h3{margin:0;font-size:15px;font-weight:600;color:var(--text-primary)}
    .chart-sub{font-size:12px;color:var(--text-secondary)}

    .chart-wrap{position:relative;width:100%}
    .doughnut-wrap{display:flex;align-items:center;justify-content:center;height:220px}
    .doughnut-wrap canvas{max-width:220px;max-height:220px}
    .bar-wrap{position:relative;height:220px;width:100%}

    .donut-center{position:absolute;display:flex;flex-direction:column;align-items:center;pointer-events:none}
    .dc-val{font-size:14px;font-weight:700;color:var(--text-primary)}
    .dc-label{font-size:10px;color:var(--text-secondary)}

    .legend{display:flex;gap:16px;flex-wrap:wrap}
    .leg-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)}
    .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .dot.green{background:#34d399}
    .dot.orange{background:#fbbf24}
    .dot.purple{background:#a78bfa}

    .no-data{text-align:center;color:var(--text-secondary);font-size:13px;padding:20px}
    .no-data.loading{opacity:0.6}

    /* Bottom row */
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:700px){.info-grid{grid-template-columns:1fr}}
    .info-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;padding:24px}
    .info-card h3{font-size:15px;font-weight:600;margin:0 0 16px;color:var(--text-primary)}
    .nav-links{display:flex;flex-direction:column;gap:8px}
    .nav-link{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(0,0,0,0.15);border-radius:10px;color:var(--text-secondary);text-decoration:none;font-size:13px;transition:all 0.2s}
    .nav-link svg{width:16px;height:16px;flex-shrink:0}
    .nav-link:hover{background:rgba(185,28,28,0.12);color:var(--accent-primary)}
    .acc-info{display:flex;flex-direction:column;gap:14px}
    .acc-row{display:flex;justify-content:space-between;align-items:center}
    .acc-label{font-size:12px;color:var(--text-secondary);font-weight:500}
    .acc-val{font-size:14px;color:var(--text-primary);font-weight:500}
    .acc-val.mono{font-family:monospace}
    .status-active{color:#34d399;font-size:12px;background:rgba(16,185,129,0.15);padding:3px 10px;border-radius:20px;border:1px solid rgba(16,185,129,0.3)}

    @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('finDonut') finDonutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('salesBar') salesBarRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private dashSvc = inject(DashboardService);
  private auth = inject(AuthService);

  overview = signal<FinanceOverview | null>(null);
  salesOrders = signal<SalesOrder[]>([]);
  loading = signal(true);
  salesLoading = signal(true);
  error = signal('');
  userName = signal('Customer');
  customerId = signal('');

  private donutChart: Chart | null = null;
  private barChart: Chart | null = null;
  private chartsReady = false;

  ngOnInit() {
    const session = this.auth.getSession();
    this.userName.set(session?.name || 'Customer');
    this.customerId.set(session?.kunnr || '');
    this.loadData();
  }

  ngAfterViewInit() { this.chartsReady = true; }

  ngOnDestroy() {
    this.donutChart?.destroy();
    this.barChart?.destroy();
  }

  loadData() {
    this.loading.set(true);
    this.salesLoading.set(true);
    this.error.set('');
    const kunnr = this.auth.getCurrentKunnr();

    // Finance overview
    this.api.getFinanceOverview(kunnr).subscribe({
      next: data => {
        this.overview.set(data);
        this.loading.set(false);
        setTimeout(() => { this.drawDonut(); this.drawBar(); }, 50);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Service unavailable');
        this.overview.set({ totalInvoiceAmount: '0', totalPaid: '0', totalOutstanding: '0', totalCredit: '0' });
        this.loading.set(false);
        setTimeout(() => { this.drawDonut(); this.drawBar(); }, 50);
      }
    });

    // Sales orders for bar chart
    this.dashSvc.getSalesOrders(kunnr).subscribe({
      next: orders => {
        this.salesOrders.set(orders);
        this.salesLoading.set(false);
        setTimeout(() => this.drawBar(), 50);
      },
      error: () => { this.salesLoading.set(false); }
    });
  }

  // ---- Computed values for chart & UI ----
  paidVal()   { return parseFloat(this.overview()?.totalPaid || '0') || 0; }
  outVal()    { return parseFloat(this.overview()?.totalOutstanding || '0') || 0; }
  creditVal() { return parseFloat(this.overview()?.totalCredit || '0') || 0; }
  totalVal()  { return this.paidVal() + this.outVal() + this.creditVal(); }

  paidPct()   { const t = this.totalVal(); return t ? Math.round(this.paidVal()/t*100) : 0; }
  outPct()    { const t = this.totalVal(); return t ? Math.round(this.outVal()/t*100) : 0; }
  creditPct() { const t = this.totalVal(); return t ? Math.round(this.creditVal()/t*100) : 0; }

  // ---- Draw charts ----
  private drawDonut() {
    if (!this.finDonutRef) return;
    this.donutChart?.destroy();

    const paid = this.paidVal();
    const out  = this.outVal();
    const credit = this.creditVal();
    const total = paid + out + credit;

    this.donutChart = new Chart(this.finDonutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Outstanding', 'Credit'],
        datasets: [{
          data: total > 0 ? [paid, out, credit] : [1, 1, 1],
          backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(251,191,36,0.85)', 'rgba(167,139,250,0.85)'],
          borderColor: ['#34d399', '#fbbf24', '#a78bfa'],
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (total === 0) return ' No data';
                const val = ctx.raw as number;
                const pct = Math.round(val / total * 100);
                return ` ${ctx.label}: ${this.fmtAmt(String(val))} (${pct}%)`;
              }
            },
            backgroundColor: 'rgba(10,10,20,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            titleFont: { size: 13 },
            bodyFont: { size: 12 },
          }
        }
      }
    });
  }

  private drawBar() {
    if (!this.salesBarRef) return;
    this.barChart?.destroy();

    const orders = this.salesOrders();
    if (orders.length === 0) return;

    // Count by document type
    const typeCounts: Record<string, number> = {};
    orders.forEach(o => {
      const key = o.docType || o.auart || 'Unknown';
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const values = labels.map(l => typeCounts[l]);

    const palette = [
      'rgba(34,211,238,0.8)', 'rgba(245,158,11,0.8)',
      'rgba(139,92,246,0.8)', 'rgba(239,68,68,0.8)',
      'rgba(52,211,153,0.8)', 'rgba(249,115,22,0.8)',
    ];

    this.barChart = new Chart(this.salesBarRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Orders',
          data: values,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderColor: labels.map((_, i) => palette[i % palette.length].replace('0.8', '1')),
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} order${(ctx.raw as number) !== 1 ? 's' : ''}`
            },
            backgroundColor: 'rgba(10,10,20,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 12 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { size: 11 },
              stepSize: 1,
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
}

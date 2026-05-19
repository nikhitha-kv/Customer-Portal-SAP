import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { SalesOrder } from '../../../core/models/order.model';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sales <span class="accent">Orders</span></h1>
          <p class="page-desc">View, track, and analyze all your sales orders and line items</p>
        </div>
        <button class="refresh-btn" (click)="loadData()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <!-- Loading -->
      <div class="skeleton-wrap" *ngIf="loading()">
        <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5,6]">
          <div class="sk w-20"></div><div class="sk w-15"></div><div class="sk w-15"></div><div class="sk w-15"></div><div class="sk w-10"></div>
        </div>
      </div>

      <!-- Error -->
      <div class="error-box" *ngIf="error() && !loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <strong>Could not load sales orders</strong>
          <p>{{ friendlyError(error()) }}</p>
        </div>
        <button class="retry-btn" (click)="loadData()">Retry</button>
      </div>

      <!-- Main Contents -->
      <ng-container *ngIf="!loading() && !error()">
        <!-- Sales Analytics Row -->
        <div class="charts-grid" *ngIf="orders().length > 0">
          <!-- Sales Amount Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Sales Value by Order</h3>
              <span class="chart-sub">Top 7 orders by net value ({{ orders().length }} total)</span>
            </div>
            <div class="chart-wrap bar-wrap">
              <canvas #salesValBar></canvas>
            </div>
          </div>

          <!-- Top Ordered Products Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Top Ordered Products</h3>
              <span class="chart-sub">Top 7 products by cumulative quantity</span>
            </div>
            <div class="chart-wrap bar-wrap">
              <canvas #topProductsBar></canvas>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-card">
          <!-- Toolbar -->
          <div class="toolbar">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search by Order ID, Material, or Description..." [(ngModel)]="searchTerm" (ngModelChange)="onSearch()"/>
              <button class="clear-btn" *ngIf="searchTerm" (click)="clearSearch()">✕</button>
            </div>
            <span class="count">Showing {{ pageStart() }} - {{ pageEnd() }} of {{ filtered().length }} {{ searchTerm ? '(filtered)' : 'records' }}</span>
          </div>

          <!-- Data -->
          <div class="table-wrap">
            <table class="data-table" *ngIf="paginated().length > 0">
              <thead>
                <tr>
                  <th style="width: 50px;"></th>
                  <th (click)="sort('vbeln')" class="sortable">Sales Order No <span class="sort-icon">{{ sortIcon('vbeln') }}</span></th>
                  <th (click)="sort('erdat')" class="sortable">Date <span class="sort-icon">{{ sortIcon('erdat') }}</span></th>
                  <th>Document Type</th>
                  <th (click)="sort('netwr')" class="sortable">Net Value <span class="sort-icon">{{ sortIcon('netwr') }}</span></th>
                  <th>Currency</th>
                  <th>Items Count</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let o of paginated()">
                  <!-- Header row -->
                  <tr [class.row-expanded]="isExpanded(o.vbeln)" (click)="toggleRow(o.vbeln)" class="clickable-row">
                    <td>
                      <button class="expand-toggle" (click)="$event.stopPropagation(); toggleRow(o.vbeln)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" [class.rotated]="isExpanded(o.vbeln)"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </td>
                    <td data-label="Sales Order No"><span class="mono">{{ o.vbeln || '—' }}</span></td>
                    <td data-label="Date">{{ formatDate(o.erdat) }}</td>
                    <td data-label="Document Type"><span class="badge" [class]="docBadge(o.docType)">{{ o.docType || o.auart || '—' }}</span></td>
                    <td data-label="Net Value"><strong>{{ formatAmt(o.netwr) }}</strong></td>
                    <td data-label="Currency"><span class="currency">{{ o.waerk || '—' }}</span></td>
                    <td data-label="Items Count"><span class="item-count-badge">{{ o.items.length }} {{ o.items.length === 1 ? 'item' : 'items' }}</span></td>
                  </tr>

                  <!-- Expandable details row -->
                  <tr *ngIf="isExpanded(o.vbeln)" class="details-row">
                    <td colspan="7">
                      <div class="details-pane">
                        <div class="details-title">Order Items Details</div>
                        
                        <div class="items-table-wrap" *ngIf="o.items.length > 0">
                          <table class="items-table">
                            <thead>
                              <tr>
                                <th>Product / Material</th>
                                <th>Ordered Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr *ngFor="let item of o.items">
                                <td data-label="Product / Material">
                                  <div class="item-desc-cell">
                                    <span class="prominent-desc">{{ item.itemDesc || 'Unnamed Product' }}</span>
                                    <span class="sub-matnr">Material ID: <span class="mono">{{ item.matnr || '—' }}</span></span>
                                  </div>
                                </td>
                                <td data-label="Ordered Quantity" class="font-semibold">
                                  {{ item.qty || '0' }}<span class="unit-badge" style="margin-left: 6px;" *ngIf="item.vrkme">{{ item.vrkme }}</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div class="no-items-state" *ngIf="o.items.length === 0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span>No sales item details available for this order.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
            
            <div class="empty" *ngIf="paginated().length === 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>{{ searchTerm ? 'No results match your search.' : 'No sales item data available' }}</p>
            </div>
          </div>

          <!-- Pagination -->
          <div class="pagination" *ngIf="totalPages() > 1">
            <button class="page-btn" [disabled]="page() === 1" (click)="setPage(page()-1)">‹</button>
            <span class="page-info">Page {{ page() }} / {{ totalPages() }}</span>
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="setPage(page()+1)">›</button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; gap:20px; }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; }
    .page-title { font-size:24px; font-weight:700; margin:0 0 4px; }
    .accent { color: var(--accent-primary); }
    .page-desc { font-size:13px; color:var(--text-secondary); margin:0; }

    .refresh-btn {
      display:flex; align-items:center; gap:6px; padding:8px 16px;
      background:var(--surface-glass); border:1px solid var(--surface-border); border-radius:8px;
      color:var(--text-primary); font-size:13px; cursor:pointer; transition:all 0.2s;
    }
    .refresh-btn svg { width:14px; height:14px; }
    .refresh-btn:hover:not(:disabled) { border-color:var(--accent-primary); color:var(--accent-primary); }
    .refresh-btn:disabled { opacity:0.5; cursor:not-allowed; }

    .skeleton-wrap { display:flex; flex-direction:column; gap:8px; }
    .skeleton-row { display:flex; gap:12px; background:var(--surface-glass); padding:16px 20px; border-radius:12px; border:1px solid var(--surface-border); }
    .sk { height:14px; background:rgba(255,255,255,0.05); border-radius:4px; animation:shimmer 1.5s infinite; }
    .w-20 { width:20%; } .w-15 { width:15%; } .w-10 { width:10%; }

    .error-box {
      display:flex; align-items:flex-start; gap:16px; padding:24px;
      background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:12px;
    }
    .error-box svg { width:24px; height:24px; color:#f87171; flex-shrink:0; margin-top:2px; }
    .error-box strong { display:block; color:#fca5a5; font-size:15px; margin-bottom:4px; }
    .error-box p { margin:0; font-size:13px; color:var(--text-secondary); word-break:break-all; }
    .retry-btn { margin-left:auto; padding:8px 16px; background:var(--accent-primary); color:white; border:none; border-radius:8px; cursor:pointer; white-space:nowrap; flex-shrink:0; }

    /* Table styling */
    .table-card { background:var(--surface-glass); border:1px solid var(--surface-border); border-radius:16px; overflow:hidden; }
    .toolbar { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--surface-border); flex-wrap:wrap; gap:10px; }
    .search-box { position:relative; display:flex; align-items:center; }
    .search-box svg { position:absolute; left:10px; width:15px; height:15px; color:var(--text-muted); }
    .search-box input { padding:8px 32px 8px 34px; background:rgba(0,0,0,0.2); border:1px solid var(--surface-border); border-radius:8px; color:var(--text-primary); font-size:13px; outline:none; width:320px; transition:border-color 0.2s; }
    .search-box input:focus { border-color:var(--accent-primary); }
    .clear-btn { position:absolute; right:8px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:12px; padding:2px 4px; }
    .count { font-size:12px; color:var(--text-secondary); }

    .table-wrap { overflow-x:auto; }
    .data-table { width:100%; border-collapse:collapse; }
    .data-table th { padding:10px 20px; background:rgba(0,0,0,0.15); color:var(--text-secondary); font-size:11px; text-transform:uppercase; letter-spacing:0.05em; text-align:left; border-bottom:1px solid var(--surface-border); white-space:nowrap; }
    .data-table th.sortable { cursor:pointer; user-select:none; }
    .data-table th.sortable:hover { color:var(--text-primary); }
    .sort-icon { font-size:10px; opacity:0.6; }
    .data-table td { padding:12px 20px; font-size:13px; color:var(--text-primary); border-bottom:1px solid var(--surface-border); }
    
    .clickable-row { cursor:pointer; transition: background-color 0.2s; }
    .clickable-row:hover { background: rgba(255,255,255,0.04) !important; }
    .row-expanded { background: rgba(255,255,255,0.02); }

    /* Expand Chevron */
    .expand-toggle {
      background: none; border: none; padding: 4px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-secondary); transition: color 0.2s;
    }
    .expand-toggle svg { width: 16px; height: 16px; transition: transform 0.2s ease; }
    .expand-toggle svg.rotated { transform: rotate(180deg); color: var(--accent-primary); }

    /* Details Panel */
    .details-row td { padding: 0; }
    .details-pane { padding: 18px 24px; border-bottom: 1px solid var(--surface-border); background: rgba(0, 0, 0, 0.12); }
    .details-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent-primary); margin-bottom: 12px; letter-spacing: 0.08em; }

    /* Nested Table Styling */
    .items-table-wrap { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th {
      padding: 10px 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 11px; text-transform: uppercase; color: var(--text-secondary); text-align: left;
    }
    .items-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; color: var(--text-primary); }
    .items-table tr:last-child td { border-bottom: none; }
    
    /* Prominent Item Description */
    .item-desc-cell { display: flex; flex-direction: column; gap: 3px; }
    .prominent-desc { font-weight: 600; font-size: 14px; color: #f8fafc; }
    .sub-matnr { font-size: 11px; color: var(--text-muted); }
    
    /* Helper Alignments */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-semibold { font-weight: 600; }
    
    /* Badges */
    .item-count-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1); }
    .unit-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: rgba(6,182,212,0.15); color: #22d3ee; border: 1px solid rgba(6,182,212,0.3); }

    .no-items-state { display: flex; align-items: center; gap: 8px; padding: 12px; color: var(--text-muted); font-size: 13px; }
    .no-items-state svg { width: 16px; height: 16px; opacity: 0.6; }

    .mono { font-family:monospace; font-weight:600; letter-spacing:0.05em; }
    .currency { font-size:12px; font-weight:600; color:var(--text-secondary); }

    .badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600; }
    .badge-inquiry { background:rgba(139,92,246,0.15); color:#a78bfa; border:1px solid rgba(139,92,246,0.3); }
    .badge-order { background:rgba(6,182,212,0.15); color:#22d3ee; border:1px solid rgba(6,182,212,0.3); }
    .badge-quote { background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); }
    .badge-default { background:rgba(255,255,255,0.08); color:var(--text-secondary); border:1px solid var(--surface-border); }

    .empty { padding:48px 20px; text-align:center; color:var(--text-secondary); }
    .empty svg { width:40px; height:40px; margin-bottom:12px; opacity:0.4; }
    .empty p { margin:0; font-size:14px; }

    .pagination { display:flex; align-items:center; justify-content:center; gap:12px; padding:14px; border-top:1px solid var(--surface-border); }
    .page-btn { width:32px; height:32px; border:1px solid var(--surface-border); border-radius:8px; background:rgba(0,0,0,0.2); color:var(--text-primary); font-size:16px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; }
    .page-btn:hover:not(:disabled) { border-color:var(--accent-primary); background:var(--accent-primary); color:white; }
    .page-btn:disabled { opacity:0.3; cursor:not-allowed; }
    .page-info { font-size:13px; color:var(--text-secondary); }

    /* Charts styling */
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    @media(max-width:900px) { .charts-grid { grid-template-columns: 1fr; } }
    .chart-card { background: var(--surface-glass); border: 1px solid var(--surface-border); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .chart-header { display: flex; flex-direction: column; gap: 2px; }
    .chart-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .chart-sub { font-size: 12px; color: var(--text-secondary); }
    .chart-wrap { position: relative; }
    .bar-wrap { position: relative; height: 220px; width: 100%; }

    @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Mobile Responsive Tables */
    @media(max-width:768px) {
      .data-table thead { display: none; }
      .data-table tbody, .data-table tr, .data-table td { display: block; width: 100%; box-sizing: border-box; }
      
      .clickable-row {
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--surface-border) !important;
        border-radius: 12px;
        margin-bottom: 12px;
        padding: 16px;
        position: relative;
      }
      .clickable-row td {
        border: none;
        padding: 6px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-align: right;
      }
      .clickable-row td::before {
        content: attr(data-label);
        font-weight: 500;
        color: var(--text-secondary);
        font-size: 12px;
        text-align: left;
        text-transform: uppercase;
      }
      
      /* Expand chevron positioning */
      .clickable-row td:first-child {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding-bottom: 10px;
        margin-bottom: 6px;
      }
      .clickable-row td:first-child::before {
        content: 'Expand Details';
        font-weight: 700;
        color: var(--text-secondary);
        font-size: 11px;
      }
      
      .details-row td {
        padding: 0;
        border: none;
      }
      .details-pane {
        border: 1px dashed var(--surface-border);
        border-top: none;
        border-radius: 0 0 12px 12px;
        margin-top: -16px;
        margin-bottom: 16px;
        padding: 16px;
        background: rgba(0,0,0,0.2);
      }
      
      .items-table thead { display: none; }
      .items-table tbody, .items-table tr, .items-table td { display: block; width: 100%; }
      .items-table tr {
        background: rgba(255,255,255,0.01);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 8px;
        margin-bottom: 8px;
        padding: 10px;
      }
      .items-table td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border: none !important;
        text-align: right;
      }
      .items-table td::before {
        content: attr(data-label);
        font-size: 11px;
        color: var(--text-muted);
        text-align: left;
        text-transform: uppercase;
      }
      .item-desc-cell {
        text-align: right;
        align-items: flex-end;
      }
    }
  `]
})
export class SalesComponent implements OnInit, OnDestroy {
  @ViewChild('salesValBar') salesValBarRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsBar') topProductsRef!: ElementRef<HTMLCanvasElement>;

  private svc = inject(DashboardService);
  private auth = inject(AuthService);

  orders = signal<SalesOrder[]>([]);
  loading = signal(true);
  error = signal('');
  searchTerm = '';
  filtered = signal<SalesOrder[]>([]);
  page = signal(1);
  pageSize = 15;
  sortField = signal<string>('');
  sortDir = signal<'asc'|'desc'>('asc');

  expandedOrders = signal<Set<string>>(new Set());

  private valChart: Chart | null = null;
  private prodChart: Chart | null = null;

  pageStart = computed(() => this.filtered().length === 0 ? 0 : (this.page()-1)*this.pageSize + 1);
  pageEnd = computed(() => Math.min(this.page()*this.pageSize, this.filtered().length));
  paginated = computed(() => { const s=(this.page()-1)*this.pageSize; return this.filtered().slice(s,s+this.pageSize); });
  totalPages = computed(() => Math.ceil(this.filtered().length/this.pageSize)||1);

  ngOnInit() { this.loadData(); }

  ngOnDestroy() {
    this.valChart?.destroy();
    this.prodChart?.destroy();
  }

  loadData() {
    this.loading.set(true);
    this.error.set('');
    this.expandedOrders.set(new Set());
    this.svc.getSalesOrders(this.auth.getCurrentKunnr()).subscribe({
      next: data => {
        this.orders.set(data);
        this.applyFilter();
        this.loading.set(false);
        setTimeout(() => this.drawCharts(), 80);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Unknown error');
        this.loading.set(false);
      }
    });
  }

  onSearch() {
    this.page.set(1);
    this.applyFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  applyFilter() {
    const t = this.searchTerm.toLowerCase().trim();
    let data = !t ? this.orders() : this.orders().filter(o =>
      (o.vbeln||'').toLowerCase().includes(t) ||
      (o.docType||'').toLowerCase().includes(t) ||
      (o.auart||'').toLowerCase().includes(t) ||
      (o.netwr||'').toLowerCase().includes(t) ||
      (o.waerk||'').toLowerCase().includes(t) ||
      (o.erdat||'').toLowerCase().includes(t) ||
      o.items.some(item =>
        (item.matnr||'').toLowerCase().includes(t) ||
        (item.itemDesc||'').toLowerCase().includes(t)
      )
    );

    // Auto-expand orders that match via item fields
    if (t) {
      const matchedExpanded = new Set<string>();
      data.forEach(o => {
        const matchesItems = o.items.some(item =>
          (item.matnr||'').toLowerCase().includes(t) ||
          (item.itemDesc||'').toLowerCase().includes(t)
        );
        if (matchesItems) {
          matchedExpanded.add(o.vbeln);
        }
      });
      this.expandedOrders.set(matchedExpanded);
    } else {
      this.expandedOrders.set(new Set());
    }

    // Apply sort
    const f = this.sortField();
    if (f) {
      const d = this.sortDir() === 'asc' ? 1 : -1;
      data = [...data].sort((a, b) => {
        const av = (a as any)[f] || '';
        const bv = (b as any)[f] || '';
        return av.localeCompare(bv, undefined, { numeric: true }) * d;
      });
    }
    this.filtered.set(data);
  }

  sort(field: string) {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.applyFilter();
  }

  sortIcon(field: string): string {
    if (this.sortField() !== field) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  setPage(p: number) { this.page.set(p); }

  toggleRow(vbeln: string) {
    const current = new Set(this.expandedOrders());
    if (current.has(vbeln)) {
      current.delete(vbeln);
    } else {
      current.add(vbeln);
    }
    this.expandedOrders.set(current);
  }

  isExpanded(vbeln: string): boolean {
    return this.expandedOrders().has(vbeln);
  }

  formatDate(d: string): string {
    if (!d) return '—';
    if (/^\d{8}$/.test(d)) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    return d;
  }

  formatAmt(v: string): string {
    const n = parseFloat(v);
    return isNaN(n) ? (v || '—') : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  docBadge(t: string): string {
    const u = (t || '').toLowerCase();
    if (u.includes('inquiry')) return 'badge badge-inquiry';
    if (u.includes('quot')) return 'badge badge-quote';
    if (u.includes('order') || u.includes('sales')) return 'badge badge-order';
    return 'badge badge-default';
  }

  friendlyError(msg: string): string {
    if (!msg) return 'An unknown error occurred.';
    if (msg.includes('web service processing error') || msg.includes('Web service processing error')) {
      return 'The SAP backend service returned an error. Please try again or contact support.';
    }
    if (msg.includes('Network') || msg.includes('network')) return 'Network connectivity issue. Check VPN or server access.';
    if (msg.includes('401') || msg.includes('credentials')) return 'Authentication failed. Please re-login.';
    return msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
  }

  // ---- Analytical Charts ----
  drawCharts() {
    const ordersList = this.orders();
    if (ordersList.length === 0) return;

    this.drawValChart(ordersList);
    this.drawProdChart(ordersList);
  }

  private drawValChart(ordersList: SalesOrder[]) {
    if (!this.salesValBarRef) return;
    this.valChart?.destroy();

    // Sort orders by Net Value descending and take top 7
    const sorted = [...ordersList]
      .map(o => ({ vbeln: o.vbeln, val: parseFloat(o.netwr) || 0 }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 7);

    if (sorted.length === 0) return;

    this.valChart = new Chart(this.salesValBarRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map(s => `Order ${s.vbeln}`),
        datasets: [{
          label: 'Order Value',
          data: sorted.map(s => s.val),
          backgroundColor: 'rgba(34,211,238,0.85)',
          borderColor: '#22d3ee',
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw as number;
                return ` Value: ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`;
              }
            },
            backgroundColor: 'rgba(10,10,20,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { size: 10 },
              callback: (v) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v as number)
            }
          }
        }
      }
    });
  }

  private drawProdChart(ordersList: SalesOrder[]) {
    if (!this.topProductsRef) return;
    this.prodChart?.destroy();

    // Aggregate quantities by product name / description
    const prodQtyMap = new Map<string, { desc: string, qty: number, unit: string }>();

    ordersList.forEach(o => {
      o.items.forEach(item => {
        const key = item.itemDesc || item.matnr || 'Unknown Product';
        const q = parseFloat(item.qty) || 0;
        const current = prodQtyMap.get(key) || { desc: key, qty: 0, unit: item.vrkme || '—' };
        current.qty += q;
        prodQtyMap.set(key, current);
      });
    });

    const sortedProds = Array.from(prodQtyMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);

    if (sortedProds.length === 0) return;

    this.prodChart = new Chart(this.topProductsRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sortedProds.map(p => p.desc.length > 20 ? p.desc.slice(0, 18) + '...' : p.desc),
        datasets: [{
          label: 'Quantity',
          data: sortedProds.map(p => p.qty),
          backgroundColor: 'rgba(167,139,250,0.85)',
          borderColor: '#a78bfa',
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y', // Horizontal bars!
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const index = ctx.dataIndex;
                const prod = sortedProds[index];
                return ` Quantity: ${prod.qty} ${prod.unit}`;
              }
            },
            backgroundColor: 'rgba(10,10,20,0.9)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }
          }
        }
      }
    });
  }
}

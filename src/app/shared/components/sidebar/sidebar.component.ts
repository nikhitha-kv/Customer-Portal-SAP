import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span class="brand-name">Customer Portal</span>
      </div>

      <nav class="sidebar-nav">
        <!-- Dashboard Group -->
        <div class="nav-group">
          <div class="nav-group-header" (click)="toggleDashboard()">
            <span class="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </span>
            <span class="nav-label">Dashboard</span>
            <svg class="chevron" [class.open]="dashboardOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="nav-group-items" *ngIf="dashboardOpen()">
            <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item child">Overview</a>
            <a routerLink="/dashboard/sales" routerLinkActive="active" class="nav-item child">Sales</a>
            <a routerLink="/dashboard/inquiry" routerLinkActive="active" class="nav-item child">Inquiry</a>
            <a routerLink="/dashboard/lod" routerLinkActive="active" class="nav-item child">LOD (Deliveries)</a>
          </div>
        </div>

        <!-- Finance Group -->
        <div class="nav-group">
          <div class="nav-group-header" (click)="toggleFinance()">
            <span class="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </span>
            <span class="nav-label">Finance</span>
            <svg class="chevron" [class.open]="financeOpen()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="nav-group-items" *ngIf="financeOpen()">
            <a routerLink="/finance/overview" routerLinkActive="active" class="nav-item child">Overview</a>
            <a routerLink="/finance/invoice" routerLinkActive="active" class="nav-item child">Invoice</a>
            <a routerLink="/finance/payments" routerLinkActive="active" class="nav-item child">Payments</a>
            <a routerLink="/finance/credit-debit" routerLinkActive="active" class="nav-item child">Credit/Debit</a>
          </div>
        </div>

        <a routerLink="/profile" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <span class="nav-label">Profile</span>
        </a>

      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" (click)="logout()">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
          <span class="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100vh;
      background: linear-gradient(180deg, #0a0a0a 0%, #110505 100%);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-right: 1px solid rgba(220, 38, 38, 0.15);
      display: flex;
      flex-direction: column;
      padding: 0;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
      overflow: hidden; /* prevent the sidebar itself from scrolling */
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 20px;
      border-bottom: 1px solid rgba(220, 38, 38, 0.15);
      position: sticky;
      top: 0;
      background: transparent;
      z-index: 10;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: var(--shadow-glow);
    }

    .brand-icon svg { width: 18px; height: 18px; color: white; stroke: white; }

    .brand-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 0.02em;
    }

    .sidebar-nav {
      flex: 1;
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto; /* only the nav scrolls */
      overflow-x: hidden;
    }

    .nav-group-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nav-group-header:hover {
      background: var(--surface-glass-hover);
      color: var(--text-primary);
    }

    .nav-group-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-left: 28px;
      margin-top: 4px;
      margin-bottom: 8px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .nav-item.child {
      padding: 8px 16px;
      font-size: 13px;
    }

    .nav-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent-primary);
      border-radius: 0 4px 4px 0;
      opacity: 0;
      transform: scaleY(0);
      transition: all 0.3s ease;
    }

    .nav-item:hover {
      background: var(--surface-glass-hover);
      color: var(--text-primary);
      transform: translateX(4px);
    }

    .nav-item.active {
      background: var(--accent-glow);
      color: var(--accent-primary);
    }

    .nav-item.active::before {
      opacity: 1;
      transform: scaleY(1);
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-icon svg { width: 18px; height: 18px; stroke: currentColor; }

    .chevron {
      width: 16px;
      height: 16px;
      margin-left: auto;
      transition: transform 0.3s;
    }

    .chevron.open { transform: rotate(180deg); }

    .nav-label { font-size: 14px; flex: 1; }

    .sidebar-footer {
      padding: 16px 12px;
      border-top: 1px solid rgba(220, 38, 38, 0.15);
      background: rgba(10, 2, 2, 0.95);
      flex-shrink: 0; /* never compress — always stays at bottom */
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      width: 100%;
      text-align: left;
      transition: all 0.3s ease;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #f87171;
      transform: translateY(-1px);
    }
  `]
})
export class SidebarComponent {
  private auth = inject(AuthService);

  dashboardOpen = signal(true);
  financeOpen = signal(true);

  toggleDashboard() {
    this.dashboardOpen.set(!this.dashboardOpen());
  }

  toggleFinance() {
    this.financeOpen.set(!this.financeOpen());
  }

  logout() {
    this.auth.logout();
  }
}

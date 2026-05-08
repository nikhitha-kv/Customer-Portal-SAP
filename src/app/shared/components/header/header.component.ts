import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="app-header">
      <div class="header-left">
        <div class="page-context">
          <span class="welcome-text">Welcome back,</span>
          <span class="customer-id">{{ customerName || customerId }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="user-badge">
          <div class="avatar">{{ nameInitial }}</div>
          <div class="user-info">
            <span class="user-name">{{ customerName || 'Customer' }}</span>
            <span class="user-id">{{ customerId }}</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 72px;
      background: rgba(10, 2, 2, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(220, 38, 38, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .page-context {
      display: flex;
      flex-direction: column;
    }

    .welcome-text {
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }

    .customer-id {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 16px 6px 6px;
      background: var(--surface-glass);
      border: 1px solid var(--surface-border);
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .user-badge:hover {
      background: var(--surface-glass-hover);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    .avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 2px 10px var(--accent-glow);
      flex-shrink: 0;
      text-transform: uppercase;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .user-id {
      font-size: 11px;
      color: var(--accent-primary);
      font-weight: 500;
      font-family: monospace;
      letter-spacing: 0.04em;
    }
  `]
})
export class HeaderComponent {
  private auth = inject(AuthService);

  get customerId(): string {
    return this.auth.getCurrentKunnr();
  }

  get customerName(): string {
    return this.auth.getSession()?.name?.trim() || '';
  }

  /** First letter of name; fallback to first letter of ID */
  get nameInitial(): string {
    const name = this.customerName;
    if (name) return name.charAt(0).toUpperCase();
    return this.customerId.replace(/^0+/, '').charAt(0) || 'C';
  }
}

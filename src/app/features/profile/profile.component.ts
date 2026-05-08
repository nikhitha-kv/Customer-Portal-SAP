import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Customer <span class="accent">Profile</span></h1>
          <p class="page-desc">Your account details and contact information</p>
        </div>
        <button class="refresh-btn" (click)="loadData()" [disabled]="loading()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <!-- Loading -->
      <div class="sk-wrap" *ngIf="loading()">
        <div class="sk-header"></div>
        <div class="sk-grid">
          <div class="sk-card"></div>
          <div class="sk-card"></div>
        </div>
      </div>

      <!-- Error -->
      <div class="err-box" *ngIf="error() && !loading()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div><strong>Failed to load profile</strong><p>{{ friendly(error()) }}</p></div>
        <button class="retry" (click)="loadData()">Retry</button>
      </div>

      <!-- Profile Content -->
      <div class="profile-wrap" *ngIf="!loading() && profile()">

        <!-- Header Card -->
        <div class="profile-header">
          <div class="avatar">{{ initials() }}</div>
          <div class="profile-title">
            <h2>{{ na(profile()?.name) }}</h2>
            <p *ngIf="profile()?.name2" class="subtitle">{{ profile()?.name2 }}</p>
            <div class="id-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Customer ID: {{ profile()?.kunnr }}
            </div>
          </div>
        </div>

        <!-- Detail Grid -->
        <div class="detail-grid">

          <!-- Contact Information -->
          <div class="detail-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 9.21 19.79 19.79 0 0 1 1.07 .6A2 2 0 0 1 3.08.4h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 14 15.82l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Contact Information
            </h3>
            <div class="field-list">
              <div class="field">
                <span class="fl">Customer Name</span>
                <span class="fv">{{ na(profile()?.name) }}</span>
              </div>
              <div class="field">
                <span class="fl">Customer Number</span>
                <span class="fv mono">{{ profile()?.kunnr || 'Not Available' }}</span>
              </div>
              <div class="field">
                <span class="fl">Phone</span>
                <span class="fv">{{ na(profile()?.phone) }}</span>
              </div>
              <div class="field">
                <span class="fl">Email</span>
                <span class="fv">{{ na(profile()?.email) }}</span>
              </div>
            </div>
          </div>

          <!-- Address Information -->
          <div class="detail-card">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Address Information
            </h3>
            <div class="field-list">
              <div class="field">
                <span class="fl">Street / Address</span>
                <span class="fv">{{ na(profile()?.street) }}</span>
              </div>
              <div class="field">
                <span class="fl">City</span>
                <span class="fv">{{ na(profile()?.city) }}</span>
              </div>
              <div class="field">
                <span class="fl">Postal Code</span>
                <span class="fv">{{ na(profile()?.pincode) }}</span>
              </div>
              <div class="field">
                <span class="fl">Country</span>
                <span class="fv">
                  <span class="country-flag">{{ profile()?.country || '' }}</span>
                  {{ na(profile()?.country) }}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:24px}.page-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}.page-title{font-size:24px;font-weight:700;margin:0 0 4px}.accent{color:var(--accent-primary)}.page-desc{font-size:13px;color:var(--text-secondary);margin:0}
    .refresh-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;transition:all 0.2s}.refresh-btn svg{width:14px;height:14px}.refresh-btn:hover:not(:disabled){border-color:var(--accent-primary);color:var(--accent-primary)}.refresh-btn:disabled{opacity:0.5;cursor:not-allowed}
    .sk-wrap{display:flex;flex-direction:column;gap:20px}.sk-header{height:120px;background:var(--surface-glass);border-radius:16px;border:1px solid var(--surface-border);animation:shimmer 1.5s infinite}.sk-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.sk-card{height:220px;background:var(--surface-glass);border-radius:16px;border:1px solid var(--surface-border);animation:shimmer 1.5s infinite}
    .err-box{display:flex;align-items:flex-start;gap:16px;padding:24px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px}.err-box svg{width:22px;height:22px;color:#f87171;flex-shrink:0;margin-top:2px}.err-box strong{display:block;color:#fca5a5;margin-bottom:4px}.err-box p{margin:0;font-size:13px;color:var(--text-secondary)}.retry{margin-left:auto;padding:8px 14px;background:var(--accent-primary);color:white;border:none;border-radius:8px;cursor:pointer}
    .profile-wrap{display:flex;flex-direction:column;gap:20px}
    .profile-header{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;padding:28px;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
    .avatar{width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:white;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
    .profile-title h2{margin:0 0 4px;font-size:22px;color:var(--text-primary)}.profile-title .subtitle{margin:0 0 10px;font-size:14px;color:var(--text-secondary)}
    .id-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(255,255,255,0.06);border:1px solid var(--surface-border);border-radius:20px;font-size:12px;color:var(--text-secondary);font-family:monospace}.id-badge svg{width:12px;height:12px}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    @media(max-width:700px){.detail-grid{grid-template-columns:1fr}}
    .detail-card{background:var(--surface-glass);border:1px solid var(--surface-border);border-radius:16px;padding:24px}
    .detail-card h3{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--text-primary);margin:0 0 20px;padding-bottom:14px;border-bottom:1px solid var(--surface-border)}.detail-card h3 svg{width:16px;height:16px;color:var(--accent-primary)}
    .field-list{display:flex;flex-direction:column;gap:16px}
    .field{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .fl{font-size:12px;color:var(--text-secondary);font-weight:500;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0;padding-top:2px}
    .fv{font-size:14px;color:var(--text-primary);font-weight:500;text-align:right;word-break:break-word}
    .fv.mono{font-family:monospace}.country-flag{font-size:12px;opacity:0.7}
    @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
  `]
})
export class ProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private auth = inject(AuthService);

  profile = signal<CustomerProfile | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    this.error.set('');
    this.profileSvc.getProfile(this.auth.getCurrentKunnr()).subscribe({
      next: p => { this.profile.set(p); this.loading.set(false); },
      error: (e: any) => { this.error.set(e?.message||'Error'); this.loading.set(false); }
    });
  }

  /** Return "Not Available" for empty/missing fields */
  na(v?: string): string { return (v && v.trim()) ? v.trim() : 'Not Available'; }

  initials(): string {
    const n = this.profile()?.name || '';
    return n ? n.trim().charAt(0).toUpperCase() : 'C';
  }

  friendly(m: string): string {
    if (!m) return 'Unknown error';
    if (m.toLowerCase().includes('web service')) return 'SAP backend error. Please retry or contact support.';
    return m.length>120 ? m.slice(0,120)+'…' : m;
  }
}

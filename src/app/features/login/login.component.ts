import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="elegant-login-container">
      <div class="login-split-left">
        <div class="gold-abstract-pattern"></div>
        <div class="brand-content">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 class="brand-title">Kaar<br>Customer Portal</h1>
          <p class="brand-tagline">Experience the pinnacle of enterprise management.</p>
        </div>
      </div>
      
      <div class="login-split-right">
        <div class="login-form-container">
          <div class="mobile-logo">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 class="form-title">Welcome Back</h2>
          <p class="form-subtitle">Please enter your credentials to proceed.</p>

          <form class="login-form" (ngSubmit)="onLogin()">
            <div class="input-group">
              <label for="kunnr">Customer Number</label>
              <div class="input-wrapper">
                <input
                  id="kunnr"
                  type="text"
                  placeholder="e.g. 0001000234"
                  [(ngModel)]="kunnr"
                  name="kunnr"
                  required
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="input-group">
              <label for="password">Password</label>
              <div class="input-wrapper">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  [(ngModel)]="password"
                  name="password"
                  required
                  autocomplete="current-password"
                />
                <button type="button" class="btn-toggle-password" (click)="showPassword = !showPassword" tabindex="-1">
                  <svg *ngIf="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg *ngIf="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>

            <div class="form-actions">
              <label class="remember-me">
                <input type="checkbox" />
                <span class="checkmark"></span>
                Remember me
              </label>
              <a href="#" class="forgot-password">Forgot password?</a>
            </div>

            <button type="submit" class="btn-submit" [disabled]="loading() || !kunnr || !password">
              <span *ngIf="!loading()">Sign In</span>
              <span *ngIf="loading()" class="spinner"></span>
            </button>
          </form>
          
          <div class="form-footer">
            <p>Secured by SAP Enterprise Authentication</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .elegant-login-container {
      display: flex;
      min-height: 100vh;
      background-color: #050505;
      font-family: 'Outfit', -apple-system, sans-serif;
    }

    .login-split-left {
      flex: 1;
      position: relative;
      background: linear-gradient(135deg, #0a0a0a 0%, #151515 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-right: 1px solid rgba(220, 38, 38, 0.1);
    }

    .gold-abstract-pattern {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 15% 50%, rgba(220, 38, 38, 0.05), transparent 25%),
        radial-gradient(circle at 85% 30%, rgba(220, 38, 38, 0.03), transparent 25%);
      z-index: 1;
    }

    .gold-abstract-pattern::after {
      content: '';
      position: absolute;
      width: 200%;
      height: 200%;
      top: -50%;
      left: -50%;
      background: 
        linear-gradient(45deg, transparent 48%, rgba(220, 38, 38, 0.02) 49%, rgba(220, 38, 38, 0.02) 51%, transparent 52%),
        linear-gradient(-45deg, transparent 48%, rgba(220, 38, 38, 0.02) 49%, rgba(220, 38, 38, 0.02) 51%, transparent 52%);
      background-size: 80px 80px;
      animation: slowPan 120s linear infinite;
    }

    @keyframes slowPan {
      0% { transform: translate(0, 0); }
      100% { transform: translate(80px, 80px); }
    }

    .brand-content {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 40px;
      max-width: 440px;
      animation: fadeIn 1s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .brand-logo {
      width: 88px;
      height: 88px;
      margin: 0 auto 32px;
      background: linear-gradient(135deg, #dc2626, #991b1b);
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 15px 35px rgba(220, 38, 38, 0.15), inset 0 2px 0 rgba(255,255,255,0.3);
      position: relative;
    }
    
    .brand-logo::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 30px;
      background: linear-gradient(135deg, #dc2626, transparent, #991b1b);
      z-index: -1;
      opacity: 0.5;
    }

    .brand-logo svg {
      width: 44px;
      height: 44px;
      stroke: #fff;
    }

    .brand-title {
      font-size: 42px;
      font-weight: 300;
      color: #fff;
      line-height: 1.15;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      font-size: 17px;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 300;
      line-height: 1.6;
    }

    .login-split-right {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #050505;
      padding: 40px;
      position: relative;
    }

    .login-split-right::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at top right, rgba(220, 38, 38, 0.03), transparent 50%);
      pointer-events: none;
    }

    .login-form-container {
      width: 100%;
      max-width: 420px;
      position: relative;
      z-index: 2;
    }

    .mobile-logo {
      display: none;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #dc2626, #991b1b);
      border-radius: 20px;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
      box-shadow: 0 10px 25px rgba(220, 38, 38, 0.15);
    }
    
    .mobile-logo svg {
      width: 32px;
      height: 32px;
      stroke: #fff;
    }

    @media (max-width: 900px) {
      .login-split-left { display: none; }
      .mobile-logo { display: flex; }
    }

    .form-title {
      font-size: 32px;
      font-weight: 400;
      color: #fff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .form-subtitle {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 48px;
      font-weight: 300;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .input-group label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(220, 38, 38, 0.9);
      font-weight: 500;
    }

    .input-wrapper {
      position: relative;
    }

    .input-wrapper input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding: 12px 0;
      color: #fff;
      font-size: 17px;
      transition: border-color 0.3s ease;
      outline: none;
      border-radius: 0;
    }
    
    .input-wrapper input:focus {
      border-bottom-color: #dc2626;
    }

    .input-wrapper input::placeholder {
      color: rgba(255, 255, 255, 0.15);
    }

    .btn-toggle-password {
      position: absolute;
      right: 0;
      bottom: 12px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0;
      transition: color 0.3s;
    }

    .btn-toggle-password:hover {
      color: #dc2626;
    }

    .btn-toggle-password svg {
      width: 20px;
      height: 20px;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: -4px;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      cursor: pointer;
      user-select: none;
    }

    .remember-me input {
      accent-color: #dc2626;
      width: 16px;
      height: 16px;
      cursor: pointer;
      background: transparent;
    }

    .forgot-password {
      color: #dc2626;
      font-size: 14px;
      text-decoration: none;
      transition: opacity 0.3s;
    }

    .forgot-password:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    .btn-submit {
      margin-top: 20px;
      padding: 18px;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 10px 25px rgba(220, 38, 38, 0.15);
    }

    .btn-submit::after {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 50%; height: 100%;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
      transform: skewX(-20deg);
      transition: left 0.6s ease;
    }

    .btn-submit:hover:not(:disabled)::after {
      left: 200%;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px rgba(220, 38, 38, 0.25);
    }

    .btn-submit:disabled {
      background: #222;
      color: #555;
      cursor: not-allowed;
      box-shadow: none;
    }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .form-footer {
      margin-top: 48px;
      text-align: center;
      color: rgba(255, 255, 255, 0.25);
      font-size: 13px;
      letter-spacing: 0.5px;
    }
  `]
})
export class LoginComponent {
  kunnr = '';
  password = '';
  showPassword = false;

  loading = signal(false);

  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  onLogin(): void {
    if (!this.kunnr || !this.password) return;

    this.loading.set(true);

    this.auth.login(this.kunnr.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Successfully logged in!');
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.toast.error(err.message || 'Login failed. Please check your credentials.');
      }
    });
  }
}

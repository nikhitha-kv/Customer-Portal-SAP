import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, map, throwError, catchError } from 'rxjs';
import { SoapService } from './soap.service';
import { extractValue } from '../utils/xml-parser.util';
import { UserSession } from '../models/user.model';

const SESSION_KEY = 'cp_session';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private soap: SoapService, private router: Router) {}

  /**
   * Login using SAP Z_CP_902095_LOGIN_FM
   */
  login(kunnr: string, password: string): Observable<UserSession> {
    const paddedKunnr = kunnr.padStart(10, '0');
    return this.soap.call('login', 'Z_CP_902095_LOGIN_FM', {
      I_KUNNR: paddedKunnr,
      I_PASSWORD: password
    }).pipe(
      map(doc => {
        const returnMsg = extractValue(doc, 'E_MESSAGE', 'E_RETURN', 'EV_MESSAGE', 'MESSAGE');
        const returnType = extractValue(doc, 'E_TYPE', 'EV_TYPE', 'TYPE');

        if (returnType === 'E' || returnMsg.toLowerCase().includes('invalid') || returnMsg.toLowerCase().includes('incorrect')) {
          throw new Error(returnMsg || 'Invalid credentials. Please try again.');
        }

        // Try many possible name fields from the login response
        const name = extractValue(doc, 'E_NAME', 'EV_NAME', 'NAME1', 'NAME', 'E_NAME1', 'KNAME');
        const session: UserSession = { kunnr: paddedKunnr, name };
        this.saveSession(session);
        return session;
      }),
      catchError(err => throwError(() => err))
    );
  }

  /** Update the stored session name (called after profile fetch if login didn't return name) */
  updateSessionName(name: string): void {
    const session = this.getSession();
    if (session && name && !session.name) {
      session.name = name;
      this.saveSession(session);
    }
  }


  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getSession();
  }

  getSession(): UserSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }

  getCurrentKunnr(): string {
    return this.getSession()?.kunnr || '';
  }

  private saveSession(session: UserSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

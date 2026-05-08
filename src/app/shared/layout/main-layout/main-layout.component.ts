import { Component, OnInit, inject } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HeaderComponent } from '../../components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, RouterOutlet],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="layout-main">
        <app-header></app-header>
        <main class="layout-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    .layout-main {
      flex: 1;
      margin-left: 240px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .layout-content {
      flex: 1;
      padding: 32px;
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private profileSvc = inject(ProfileService);

  ngOnInit() {
    // If the session has no name (SAP login didn't return it), fetch from profile API
    const session = this.auth.getSession();
    if (session && !session.name) {
      this.profileSvc.getProfile(session.kunnr).subscribe({
        next: profile => {
          if (profile?.name) {
            this.auth.updateSessionName(profile.name);
          }
        },
        error: () => { /* silently ignore — header will show ID */ }
      });
    }
  }
}

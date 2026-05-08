import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { SalesComponent } from './features/dashboard/sales/sales.component';
import { InquiryComponent } from './features/dashboard/inquiry/inquiry.component';
import { LodComponent } from './features/dashboard/lod/lod.component';
import { ProfileComponent } from './features/profile/profile.component';
import { FinanceOverviewComponent } from './features/financial/finance-overview/finance-overview.component';
import { InvoiceComponent } from './features/financial/invoice/invoice.component';
import { PaymentsComponent } from './features/financial/payments/payments.component';
import { CreditDebitComponent } from './features/financial/credit-debit/credit-debit.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'dashboard/sales', component: SalesComponent },
      { path: 'dashboard/inquiry', component: InquiryComponent },
      { path: 'dashboard/lod', component: LodComponent },
      { path: 'finance/overview', component: FinanceOverviewComponent },
      { path: 'finance/invoice', component: InvoiceComponent },
      { path: 'finance/payments', component: PaymentsComponent },
      { path: 'finance/credit-debit', component: CreditDebitComponent },
      { path: 'profile', component: ProfileComponent },
    ]
  },
  { path: '**', redirectTo: 'login' }
];

import { Component, ChangeDetectorRef, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  redirectingToKeycloak = true;
  loggingIn = false;
  showInactiveCompanyModal = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  async ngOnInit(): Promise<void> {
    const companyInactiveFromGuard = this.route.snapshot.queryParamMap.get('companyInactive') === '1';
    if (companyInactiveFromGuard) {
      this.showInactiveCompanyState('query_param_guard');
      return;
    }

    this.loggingIn = true;
    const handled = await this.auth.handleKeycloakRedirect({ upsert: false });
    this.loggingIn = false;

    if (handled) {
      if (this.auth.isKeycloakUserFlow()) {
        this.router.navigateByUrl('/register?type=user');
        return;
      }

      if (this.auth.isKeycloakCompanyFlow()) {
        this.router.navigateByUrl('/register?type=company');
        return;
      }

      const currentUser = this.auth.getCurrentUser();
      const appRole = String(currentUser?.role ?? '').toLowerCase();
      const isEmpresaRole = appRole === 'empresa' || appRole === 'company';
      const isUserRole = appRole === 'usuario' || appRole === 'user';
      const isAdminRole = appRole === 'admin';

      console.info(
        '[LOGIN][POST_REDIRECT]',
        '| username:', currentUser?.username ?? '(sin username)',
        '| email:', currentUser?.email ?? '(sin email)',
        '| role:', appRole || '(vacío)',
        '| isEmpresaRole:', isEmpresaRole
      );

      if (isEmpresaRole) {
        const needsProfileCompletion = await this.auth.companyProfileNeedsCompletion();
        console.info('[LOGIN][COMPANY] companyProfileNeedsCompletion =>', needsProfileCompletion);
        if (needsProfileCompletion) {
          this.router.navigateByUrl('/register?type=company');
          return;
        }

        const isCompanyActive = await this.auth.companyAccountIsActive();
        console.info('[LOGIN][COMPANY] companyAccountIsActive =>', isCompanyActive);
        if (!isCompanyActive) {
          this.showInactiveCompanyState('post_login_validation');
          return;
        }
      }

      if (isUserRole) {
        const needsProfileCompletion = await this.auth.userProfileNeedsCompletion();
        if (needsProfileCompletion) {
          this.router.navigateByUrl('/register?type=user');
          return;
        }
      }

      const returnUrl = this.auth.consumeKeycloakReturnUrl();
      const shouldUseReturnUrl =
        !!returnUrl &&
        returnUrl !== '/' &&
        !returnUrl.startsWith('/login');

      if (shouldUseReturnUrl) {
        this.router.navigateByUrl(returnUrl);
        return;
      }

      console.info(
        '[LOGIN] Redirigiendo post-login →',
        'usuario:', currentUser?.username,
        '| email:', currentUser?.email,
        '| rol:', appRole
      );

      if (isEmpresaRole) {
        this.router.navigateByUrl('/companies/dashboard');
        return;
      }
      if (isUserRole) {
        this.router.navigateByUrl('/');
        return;
      }
      if (isAdminRole) {
        this.router.navigateByUrl('/admin/dashboard');
        return;
      }

      this.router.navigateByUrl('/');
      return;
    }

    this.auth.keycloakLogin();
  }

  closeInactiveCompanyModal(): void {
    this.showInactiveCompanyModal = false;
    this.redirectingToKeycloak = true;
    this.auth.keycloakLogin();
  }

  private showInactiveCompanyState(source: 'query_param_guard' | 'post_login_validation'): void {
    this.ngZone.run(() => {
      // Cuenta de empresa inactiva: no dejamos sesión local iniciada en la app.
      this.auth.logout();
      this.redirectingToKeycloak = false;
      this.loggingIn = false;
      this.showInactiveCompanyModal = true;
      console.info('[LOGIN][COMPANY] Sesión local limpiada por cuenta inactiva');
      console.info('[LOGIN][COMPANY] Modal inactiva mostrado desde:', source);
      this.cdr.detectChanges();
    });
  }
}

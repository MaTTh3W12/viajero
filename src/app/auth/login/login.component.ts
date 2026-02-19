import { Component, ChangeDetectorRef, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, AuthUser } from '../../service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  errorMessage = '';
  loggingIn = false;
  loginSuccess = false;
  loginError = false;
  showValidation = false;
  private currentUser: AuthUser | undefined;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  async ngOnInit(): Promise<void> {
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

      const role = String(this.auth.getCurrentUser()?.role ?? '').toLowerCase();
      console.log('[AUTH] rol detectado en callback:', role || '(sin rol)');
      if (role === 'empresa' || role === 'company') {
        this.router.navigateByUrl('/companies/dashboard');
        return;
      }
      if (role === 'admin') {
        this.router.navigateByUrl('/admin/dashboard');
        return;
      }

      this.router.navigateByUrl('/');
    }
  }

  onSubmit() {
    this.errorMessage = '';
    this.loggingIn = true;
    this.loginSuccess = false;
    this.loginError = false;
    this.showValidation = false;

    setTimeout(() => {
      const user = this.auth.login(this.username.trim(), this.password.trim());

      this.loggingIn = false;

      if (!user) {
        this.loginError = true;
        this.cdr.detectChanges();
        return;
      }

      this.currentUser = user;
      this.loginSuccess = true;
      this.cdr.detectChanges();
    }, 1500);
  }

  closeError() {
    this.loginError = false;
    this.showValidation = true;
  }

  onInputChange() {
    if (this.showValidation) {
      this.showValidation = false;
    }
  }

  onContinue() {
    if (!this.currentUser) return;

    if (this.currentUser.role === 'admin') {
      this.router.navigateByUrl('/admin/dashboard');
    } else if (this.currentUser.role === 'empresa') {
      this.router.navigateByUrl('/companies/dashboard');
    } else {
      this.router.navigateByUrl('/');
    }
  }

  loginKeycloak(): void {
    this.auth.keycloakLogin();
  }

  registerKeycloakUser(): void {
    this.auth.keycloakRegisterUser();
  }

  registerKeycloakCompany(): void {
    this.auth.keycloakRegisterCompany();
  }
}

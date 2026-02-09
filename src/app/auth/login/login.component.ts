import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
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
export class LoginComponent {
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
  ) {}

  onSubmit() {
    console.log('onSubmit: Iniciando proceso de login');
    this.errorMessage = '';
    this.loggingIn = true;
    this.loginSuccess = false;
    this.loginError = false;
    this.showValidation = false;

    // Simulamos el tiempo de espera de una petición al servidor (ej. 1.5 segundos)
    setTimeout(() => {
      // Verificamos las credenciales
      const user = this.auth.login(this.username.trim(), this.password.trim());

      this.loggingIn = false; // Ocultamos el loading

      if (!user) {
        this.loginError = true;
        this.cdr.detectChanges(); // Forzamos la detección de cambios
        return;
      }

      this.currentUser = user;
      this.loginSuccess = true;
      this.cdr.detectChanges(); // Forzamos la detección de cambios
    }, 1500);
  }

  closeError() {
    this.loginError = false;
    // Activamos las validaciones en los inputs
    this.showValidation = true;
    // No borramos los campos para que el usuario vea qué puso
  }

  onInputChange() {
    // Al escribir, ocultamos la validación visual (borde rojo)
    if (this.showValidation) {
      this.showValidation = false;
    }
  }

  onContinue() {
    if (!this.currentUser) return;

    // Dependiendo del rol, redirigimos a Public o Private
    if (this.currentUser.role === 'admin') {
      this.router.navigateByUrl('/admin/dashboard');
    } else if (this.currentUser.role === 'empresa') {
      this.router.navigateByUrl('/companies/dashboard');
    } else {
      this.router.navigateByUrl('/');
    }
  }
}

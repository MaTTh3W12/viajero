import { Component } from '@angular/core';
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

  constructor(private auth: AuthService, private router: Router) {}

  get demoUsers(): AuthUser[] {
    return this.auth.getAllUsers();
  }

  async onSubmit() {
    this.errorMessage = '';
    this.loggingIn = true;

    // Simulación ligera de async
    await new Promise((resolve) => setTimeout(resolve, 300));

    const user = this.auth.login(this.username.trim(), this.password.trim());

    this.loggingIn = false;

    if (!user) {
      this.errorMessage = 'Usuario o contraseña incorrectos.';
      return;
    }

    // Dependiendo del rol, redirigimos a Public o Private
    if (user.role === 'admin') {
      this.router.navigateByUrl('/dashboard');
    } else {
      this.router.navigateByUrl('/');
    }
  }
}

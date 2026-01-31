import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  // Estado UI
  showPassword = false;
  showConfirmPassword = false;
  isCompany = false;
  registering = false;
  showValidation = false;
  emailFormatInvalid = false;
  registerSuccess = false;

  // Modelo de datos (Usuario)
  nombres = '';
  apellidos = '';
  email = '';
  telefono = '';
  pais = '';
  tipoDoc = '';
  numDoc = '';
  password = '';

  // Modelo de datos (Empresa)
  nombreComercial = '';
  razonSocial = '';
  direccion = '';
  nit = '';

  constructor(private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isCompany = params['type'] === 'company';
      // Resetear al cambiar de tipo
      this.resetForm();
    });
  }

  resetForm() {
    this.showValidation = false;
    this.registerSuccess = false;
    this.nombres = '';
    this.apellidos = '';
    this.email = '';
    this.telefono = '';
    this.numDoc = '';
    this.password = '';
    this.nombreComercial = '';
    this.razonSocial = '';
    this.direccion = '';
    this.nit = '';
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onInputChange() {
    if (this.showValidation) {
      this.showValidation = false;
    }
    this.emailFormatInvalid = false;
  }

  onPhoneInput(event: any) {
    this.onInputChange();

    if (this.pais === 'El Salvador') {
      let value = event.target.value.replace(/\D/g, '');
      if (value.length > 8) {
        value = value.substring(0, 8);
      }
      if (value.length > 4) {
        value = value.substring(0, 4) + '-' + value.substring(4);
      }
      this.telefono = value;
      event.target.value = this.telefono;
    }
  }

  onDuiInput(event: any) {
    this.onInputChange();

    // Validar solo si es DUI (aunque por ahora solo tenemos DUI en la vista)
    if (this.tipoDoc === 'DUI') {
        let value = event.target.value.replace(/\D/g, ''); // Solo números

        // Máximo 9 dígitos
        if (value.length > 9) {
            value = value.substring(0, 9);
        }

        // Formato: 00000000-0 (8 dígitos + guion + 1 dígito)
        if (value.length > 8) {
            value = value.substring(0, 8) + '-' + value.substring(8);
        }

        this.numDoc = value;
        event.target.value = this.numDoc; // Forzar actualización visual
    }
  }

  onNitInput(event: any) {
    this.onInputChange();

    let value = event.target.value.replace(/\D/g, ''); // Solo números

    // Máximo 14 dígitos
    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    // Formato: 0000-000000-000-0
    let formattedValue = value;
    if (value.length > 4) {
      formattedValue = value.substring(0, 4) + '-' + value.substring(4);
    }
    if (value.length > 10) {
      formattedValue = value.substring(0, 4) + '-' + value.substring(4, 10) + '-' + value.substring(10);
    }
    if (value.length > 13) {
      formattedValue = value.substring(0, 4) + '-' + value.substring(4, 10) + '-' + value.substring(10, 13) + '-' + value.substring(13);
    }

    this.nit = formattedValue;
    event.target.value = this.nit;
  }

  onSubmit(event: Event) {
    event.preventDefault();

    // Resetear estados
    this.showValidation = false;
    this.registerSuccess = false;

    // 1. Validar primero
    const isValid = this.validateForm();

    if (!isValid) {
      this.showValidation = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Si es válido, mostrar loading
    this.registering = true;

    // 3. Simular espera de 2 segundos y mostrar éxito
    setTimeout(() => {
      this.registering = false;
      this.registerSuccess = true;
      this.cdr.detectChanges();
    }, 2000);
  }

  validateForm(): boolean {
    const isEmailFormatValid = this.email && this.email.includes('@');
    if (this.email && !isEmailFormatValid) {
       this.emailFormatInvalid = true;
       return false;
    }

    if (this.isCompany) {
      return !!(
        this.nombreComercial?.trim() &&
        this.razonSocial?.trim() &&
        this.email?.trim() &&
        isEmailFormatValid &&
        this.telefono?.trim() &&
        this.direccion?.trim() &&
        this.nit?.trim() &&
        this.password?.trim()
      );
    } else {
      return !!(
        this.nombres?.trim() &&
        this.apellidos?.trim() &&
        this.email?.trim() &&
        isEmailFormatValid &&
        this.telefono?.trim() &&
        this.numDoc?.trim() &&
        this.password?.trim()
      );
    }
  }

  onGoToPortal() {
    this.router.navigateByUrl('/');
  }
}

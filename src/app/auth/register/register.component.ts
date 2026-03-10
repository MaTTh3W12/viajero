import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../service/auth.service';
import { CountryOption, DocumentTypeOption, UserProfileService } from '../../service/user-profile.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  showPassword = false;
  showConfirmPassword = false;
  isCompany = false;
  registering = false;
  showValidation = false;
  emailFormatInvalid = false;
  registerSuccess = false;

  nombres = '';
  apellidos = '';
  email = '';
  telefono = '';
  pais = '';
  tipoDoc = '';
  numDoc = '';
  password = '';

  nombreComercial = '';
  razonSocial = '';
  direccion = '';
  nit = '';

  countries: CountryOption[] = [
    { code: 'SV', name: 'El Salvador', phone_code: '+503' },
  ];

  documentTypes: DocumentTypeOption[] = [
    { id: 'DUI', description: 'Documento Único de Identidad' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private profile: UserProfileService
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(async params => {
      this.isCompany = params['type'] === 'company';
      this.resetForm();

      const cleanUrl = this.isCompany
        ? '/register?type=company'
        : '/register?type=user';

      await this.auth.handleKeycloakRedirect({
        upsert: false,
        cleanUrl,
      });

      if (!this.isCompany) {
        this.prefillFromKeycloak();
      } else {
        this.prefillCompanyFromKeycloak();
      }

      await this.loadMasterData();
    });
  }

  private async loadMasterData(): Promise<void> {
    const token = this.auth.token;
    if (!token) return;

    try {
      const [documentTypes, countries] = await Promise.all([
        firstValueFrom(this.profile.getDocumentTypes(token)),
        firstValueFrom(this.profile.getCountriesPaged(token, { limit: 100, offset: 0 })),
      ]);

      if (documentTypes.length > 0) {
        this.documentTypes = documentTypes;
      }

      if (countries.rows.length > 0) {
        this.countries = countries.rows;
      }
    } catch (error) {
      console.warn('[REGISTER] Error loading master data', error);
    }
  }

  private prefillFromKeycloak(): void {
    const kcUser = this.auth.getKeycloakUser();
    if (!kcUser) return;

    this.nombres = kcUser.firstName ?? this.nombres;
    this.apellidos = kcUser.lastName ?? this.apellidos;
    this.email = kcUser.email ?? kcUser.username ?? this.email;
  }


  private prefillCompanyFromKeycloak(): void {
    const kcUser = this.auth.getKeycloakUser();
    if (!kcUser) return;

    this.email = kcUser.email ?? kcUser.username ?? this.email;
  }

  resetForm(): void {
    this.showValidation = false;
    this.registerSuccess = false;
    this.nombres = '';
    this.apellidos = '';
    this.email = '';
    this.telefono = '';
    this.pais = '';
    this.tipoDoc = '';
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

  onInputChange(): void {
    if (this.showValidation) {
      this.showValidation = false;
    }
    this.emailFormatInvalid = false;
  }

  onPhoneInput(event: any): void {
    this.onInputChange();

    if (this.pais === 'SV') {
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

  onDuiInput(event: any): void {
    this.onInputChange();

    if (this.tipoDoc === 'DUI') {
      let value = event.target.value.replace(/\D/g, '');

      if (value.length > 9) {
        value = value.substring(0, 9);
      }

      if (value.length > 8) {
        value = value.substring(0, 8) + '-' + value.substring(8);
      }

      this.numDoc = value;
      event.target.value = this.numDoc;
    }
  }

  onNitInput(event: any): void {
    this.onInputChange();

    let value = event.target.value.replace(/\D/g, '');

    if (value.length > 14) {
      value = value.substring(0, 14);
    }

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

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    console.log('[REGISTER] submit click', {
      isCompany: this.isCompany,
      isKeycloakLoggedIn: this.auth.isKeycloakLoggedIn(),
    });

    this.showValidation = false;
    this.registerSuccess = false;

    const isValid = this.validateForm();

    if (!isValid) {
      this.showValidation = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.registering = true;

    if (!this.isCompany && this.auth.isKeycloakLoggedIn()) {
      const completed = await this.auth.completeKeycloakUserProfile({
        first_name: this.nombres,
        last_name: this.apellidos,
        email: this.email,
        document_id: this.numDoc,
        document_type_id: this.tipoDoc,
        phone: this.telefono,
        country: this.pais,
        city: null,
      });

      this.registering = false;
      console.log('[REGISTER] completeKeycloakCompanyProfile result', { completed });
      if (completed) {
        this.registerSuccess = true;
      } else {
        this.showValidation = true;
      }
      this.cdr.detectChanges();
      return;
    }

    if (this.isCompany && this.auth.isKeycloakLoggedIn()) {
      console.log('[REGISTER] calling completeKeycloakCompanyProfile', {
        nombreComercial: this.nombreComercial,
        razonSocial: this.razonSocial,
        email: this.email,
        telefono: this.telefono,
        direccion: this.direccion,
        nit: this.nit,
      });
      const completed = await this.auth.completeKeycloakCompanyProfile({
        company_commercial_name: this.nombreComercial,
        company_nit: this.nit,
        company_email: this.email,
        company_phone: this.telefono,
        company_logo_url: null,
        company_description: this.razonSocial || null,
        company_address: this.direccion,
        company_profile_completed: true,
        phone: this.telefono,
        country: 'SV',
        city: null,
      });

      this.registering = false;
      console.log('[REGISTER] completeKeycloakCompanyProfile result', { completed });
      if (completed) {
        this.registerSuccess = true;
      } else {
        this.showValidation = true;
      }
      this.cdr.detectChanges();
      return;
    }

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
        this.nit?.trim()
      );
    }

    return !!(
      this.nombres?.trim() &&
      this.apellidos?.trim() &&
      this.email?.trim() &&
      isEmailFormatValid &&
      this.telefono?.trim() &&
      this.pais?.trim() &&
      this.tipoDoc?.trim() &&
      this.numDoc?.trim()
    );
  }

  onGoToPortal(): void {
    this.router.navigateByUrl(this.isCompany ? '/companies/dashboard' : '/');
  }

  get selectedCountryPhoneCode(): string {
    const selectedCountry = this.countries.find((country) => country.code === this.pais);
    return selectedCountry?.phone_code ?? '+503';
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../service/auth.service';
import { CountryOption, DocumentTypeOption, UserProfileService } from '../../service/user-profile.service';

interface PhoneDigitsRule {
  min: number;
  max: number;
  placeholder: string;
}

const DEFAULT_PHONE_RULE: PhoneDigitsRule = {
  min: 7,
  max: 15,
  placeholder: '0000000',
};

const PHONE_RULES_BY_COUNTRY: Record<string, PhoneDigitsRule> = {
  SV: { min: 8, max: 8, placeholder: '0000-0000' },
  GT: { min: 8, max: 8, placeholder: '0000-0000' },
  HN: { min: 8, max: 8, placeholder: '0000-0000' },
  NI: { min: 8, max: 8, placeholder: '0000-0000' },
  CR: { min: 8, max: 8, placeholder: '0000-0000' },
  PA: { min: 8, max: 8, placeholder: '0000-0000' },
  MX: { min: 10, max: 10, placeholder: '0000000000' },
  US: { min: 10, max: 10, placeholder: '0000000000' },
  CA: { min: 10, max: 10, placeholder: '0000000000' },
};

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
  phoneFormatInvalid = false;
  documentFormatInvalid = false;
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
    { id: 'PASSPORT', description: 'Pasaporte' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private profile: UserProfileService
  ) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParams;
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

    this.cdr.detectChanges();
    await this.loadMasterData();
    this.cdr.detectChanges();
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

      if (!this.tipoDoc && this.documentTypes.length > 0) {
        this.tipoDoc = this.documentTypes[0].id;
      }

      if (!this.pais && !this.isCompany && this.countries.length > 0) {
        this.pais = this.countries[0].code;
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

  goToLogin(): void {
    this.auth.keycloakLogin();
  }

  resetForm(): void {
    this.showValidation = false;
    this.emailFormatInvalid = false;
    this.phoneFormatInvalid = false;
    this.documentFormatInvalid = false;
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
    this.phoneFormatInvalid = false;
    this.documentFormatInvalid = false;
  }

  onPhoneInput(event: any): void {
    this.onInputChange();
    this.telefono = this.normalizePhone(event.target.value);
    event.target.value = this.telefono;
  }

  onCountryChange(): void {
    this.onInputChange();
    this.telefono = this.normalizePhone(this.telefono);
  }

  onDocumentTypeChange(): void {
    this.onInputChange();
    this.numDoc = this.normalizeDocumentNumber(this.numDoc);
  }

  onDuiInput(event: any): void {
    this.onInputChange();
    this.numDoc = this.normalizeDocumentNumber(event.target.value);
    event.target.value = this.numDoc;
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
        phone: this.telefono.trim(),
        country: this.selectedCountryCode,
        city: null,
      });

      this.registering = false;
      if (completed) {
        this.registerSuccess = true;
      } else {
        this.showValidation = true;
      }
      this.cdr.detectChanges();
      return;
    }

    if (this.isCompany && this.auth.isKeycloakLoggedIn()) {
      const completed = await this.auth.completeKeycloakCompanyProfile({
        company_commercial_name: this.nombreComercial,
        company_nit: this.nit,
        company_email: this.email,
        company_phone: this.telefono,
        company_logo_url: null,
        company_description: this.razonSocial || null,
        company_address: this.direccion,
        company_profile_completed: true,
        phone: this.telefono.trim(),
        country: this.selectedCountryCode,
        city: null,
      });

      this.registering = false;
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
    this.emailFormatInvalid = false;
    this.phoneFormatInvalid = false;
    this.documentFormatInvalid = false;

    const isEmailFormatValid = this.email && this.email.includes('@');
    if (this.email && !isEmailFormatValid) {
      this.emailFormatInvalid = true;
    }

    const hasValidPhone = this.hasValidPhoneForSelectedCountry();
    if (this.telefono?.trim() && !hasValidPhone) {
      this.phoneFormatInvalid = true;
    }

    if (this.isCompany) {
      return !!(
        this.nombreComercial?.trim() &&
        this.razonSocial?.trim() &&
        this.email?.trim() &&
        isEmailFormatValid &&
        this.telefono?.trim() &&
        hasValidPhone &&
        this.direccion?.trim() &&
        this.nit?.trim()
      );
    }

    const hasValidDocument = this.hasValidDocumentByType();
    if (this.numDoc?.trim() && !hasValidDocument) {
      this.documentFormatInvalid = true;
    }

    return !!(
      this.nombres?.trim() &&
      this.apellidos?.trim() &&
      this.email?.trim() &&
      isEmailFormatValid &&
      this.telefono?.trim() &&
      hasValidPhone &&
      this.pais?.trim() &&
      this.tipoDoc?.trim() &&
      this.numDoc?.trim() &&
      hasValidDocument
    );
  }

  onGoToPortal(): void {
    this.router.navigateByUrl(this.isCompany ? '/companies/dashboard' : '/');
  }

  get selectedCountryPhoneCode(): string {
    const selectedCountry = this.countries.find((country) => country.code === this.selectedCountryCode);
    return selectedCountry?.phone_code ?? '+503';
  }

  get phonePlaceholder(): string {
    return this.getPhoneRule().placeholder;
  }

  get documentPlaceholder(): string {
    if (this.isPassportDocumentType()) {
      return 'A0000000';
    }

    if (this.isDuiDocumentType()) {
      return '00000000-0';
    }

    return 'Ingresar documento';
  }

  get phoneValidationMessage(): string {
    const rule = this.getPhoneRule();

    if (rule.min === rule.max) {
      return `El teléfono para este país debe tener ${rule.min} dígitos.`;
    }

    return `El teléfono para este país debe tener entre ${rule.min} y ${rule.max} dígitos.`;
  }

  get passportValidationMessage(): string {
    return 'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.';
  }

  get documentValidationMessage(): string {
    if (this.isPassportDocumentType()) {
      return this.passportValidationMessage;
    }

    if (this.isDuiDocumentType()) {
      return 'El DUI debe tener formato 00000000-0.';
    }

    return 'El número de documento no es válido.';
  }

  private get selectedCountryCode(): string {
    if (this.isCompany) return 'SV';
    return (this.pais ?? '').trim().toUpperCase();
  }

  private getPhoneRule(countryCode?: string): PhoneDigitsRule {
    const code = (countryCode ?? this.selectedCountryCode).trim().toUpperCase();
    return PHONE_RULES_BY_COUNTRY[code] ?? DEFAULT_PHONE_RULE;
  }

  private normalizePhone(value: string): string {
    const digits = (value ?? '').replace(/\D/g, '');
    const rule = this.getPhoneRule();
    const trimmed = digits.slice(0, rule.max);

    if (rule.max === 8) {
      return trimmed.length > 4
        ? `${trimmed.slice(0, 4)}-${trimmed.slice(4)}`
        : trimmed;
    }

    return trimmed;
  }

  private hasValidPhoneForSelectedCountry(): boolean {
    const digits = (this.telefono ?? '').replace(/\D/g, '');
    const rule = this.getPhoneRule();
    return digits.length >= rule.min && digits.length <= rule.max;
  }

  private normalizeDocumentNumber(value: string): string {
    if (this.isDuiDocumentType()) {
      const digits = (value ?? '').replace(/\D/g, '').slice(0, 9);
      return digits.length > 8
        ? `${digits.slice(0, 8)}-${digits.slice(8)}`
        : digits;
    }

    if (this.isPassportDocumentType()) {
      return (value ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 12);
    }

    return (value ?? '').trim().slice(0, 30);
  }

  private hasValidDocumentByType(): boolean {
    const value = (this.numDoc ?? '').trim();
    if (!value) return false;

    if (this.isDuiDocumentType()) {
      return /^\d{8}-\d$/.test(value);
    }

    if (this.isPassportDocumentType()) {
      return /^[A-Z0-9]{6,12}$/.test(value.toUpperCase());
    }

    return value.length >= 3;
  }

  private isDuiDocumentType(): boolean {
    const selectedType = this.documentTypes.find((doc) => doc.id === this.tipoDoc);
    const normalizedId = this.normalizeComparisonText(selectedType?.id ?? this.tipoDoc ?? '');
    const normalizedDescription = this.normalizeComparisonText(selectedType?.description ?? '');

    return (
      normalizedId === 'DUI' ||
      normalizedDescription.includes('DOCUMENTO UNICO DE IDENTIDAD') ||
      normalizedDescription.includes('DUI')
    );
  }

  isPassportDocumentType(): boolean {
    const selectedType = this.documentTypes.find((doc) => doc.id === this.tipoDoc);
    const normalizedId = this.normalizeComparisonText(selectedType?.id ?? this.tipoDoc ?? '');
    const normalizedDescription = this.normalizeComparisonText(selectedType?.description ?? '');

    return (
      normalizedId.includes('PASSPORT') ||
      normalizedId.includes('PASAPORTE') ||
      normalizedDescription.includes('PASAPORTE') ||
      normalizedDescription.includes('PASSPORT')
    );
  }

  private normalizeComparisonText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthService } from '../../../service/auth.service';
import { UserCompanyProfile, UserProfileService } from '../../../service/user-profile.service';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';

type CompanyProfileFormValue = {
  commercialName: string;
  nit: string;
  businessEmail: string;
  phone: string;
  mobile: string;
  category: string;
  description: string;
  address: string;
  website: string;
  mapsUrl: string;
  facebook: string;
  instagram: string;
  x: string;
  youtube: string;
};

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './company-profile.component.html',
  styleUrl: './company-profile.component.css',
})
export class CompanyProfileComponent implements OnInit {
  private static readonly MAX_LOGO_FILE_SIZE_BYTES = 300 * 1024;
  private static readonly ALLOWED_LOGO_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
  ]);

  selectedLogoName = '';
  private selectedLogoBase64: string | null = null;
  private backendProfile: UserCompanyProfile | null = null;
  saving = false;
  saveError = '';
  saveSuccess = '';
  private initialFormValue: CompanyProfileFormValue = this.getEmptyFormValue();
  profileForm;

  categories = [
    'Restaurantes',
    'Hoteles',
    'Turismo',
    'Entretenimiento',
    'Servicios'
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private userProfileService: UserProfileService
  ) {
    this.profileForm = this.fb.group({
      commercialName: ['', Validators.required],
      nit: ['', Validators.required],
      businessEmail: ['', [Validators.required, Validators.email]],
      phone: [''],
      mobile: [''],
      category: [''],
      description: [''],
      address: [''],
      website: [''],
      mapsUrl: [''],
      facebook: [''],
      instagram: [''],
      x: [''],
      youtube: ['']
    });
  }

  ngOnInit(): void {
    this.prefillFromSessionAndToken();
    void this.prefillFromBackendProfile();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.saveError = '';
    this.saveSuccess = '';

    if (!file) {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      return;
    }

    const mimeType = String(file.type ?? '').toLowerCase();
    if (!CompanyProfileComponent.ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      input.value = '';
      this.saveError = 'Formato inválido. Solo se permiten JPG o PNG.';
      return;
    }

    if (file.size > CompanyProfileComponent.MAX_LOGO_FILE_SIZE_BYTES) {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      input.value = '';
      this.saveError = 'El logo excede el tamaño permitido (máximo 300 KB).';
      return;
    }

    this.selectedLogoName = file.name;

    const reader = new FileReader();
    reader.onerror = () => {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      input.value = '';
      this.saveError = 'No se pudo leer el archivo de logo. Intenta nuevamente.';
    };
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const commaIndex = result.indexOf(',');
      this.selectedLogoBase64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : result;
    };
    reader.readAsDataURL(file);
  }

  async saveChanges(): Promise<void> {
    this.saveError = '';
    this.saveSuccess = '';
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      this.saveError = 'Completa los campos obligatorios antes de guardar.';
      return;
    }

    const token = this.auth.token;
    if (!token) {
      this.saveError = 'Tu sesión expiró. Inicia sesión nuevamente.';
      return;
    }

    this.saving = true;

    const form = this.profileForm.getRawValue();
    const current = this.auth.getCurrentUser();

    if (this.selectedLogoBase64 && this.selectedLogoBase64.length > 420000) {
      this.saveError = 'El logo seleccionado genera una carga demasiado grande. Usa una imagen más liviana.';
      this.saving = false;
      return;
    }

    try {
      const completed = await Promise.race<boolean>([
        this.auth.completeKeycloakCompanyProfile({
        company_commercial_name: form.commercialName || null,
        company_nit: form.nit || null,
        company_email: form.businessEmail || null,
        company_phone: form.phone || null,
        company_mobile: form.mobile || null,
        company_logo_url: this.backendProfile?.company_logo_url ?? null,
        company_description: form.description || null,
        company_address: form.address || null,
        company_category: this.parseCategoryId(form.category),
        company_website: form.website || null,
        company_map_url: form.mapsUrl || null,
        company_facebook: form.facebook || null,
        company_instagram: form.instagram || null,
        company_twitter: form.x || null,
        company_youtube: form.youtube || null,
        company_profile_completed: true,
        image: this.selectedLogoBase64,
        first_name: current?.firstName ?? null,
        last_name: current?.lastName ?? null,
        document_id: this.backendProfile?.document_id ?? null,
        document_type_id: this.backendProfile?.document_type_id ?? null,
        phone: this.backendProfile?.phone ?? form.mobile ?? null,
        country: this.backendProfile?.country ?? null,
        city: this.backendProfile?.city ?? null,
        }),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 25000)),
      ]);

      if (!completed) {
        this.saveError = 'No se pudieron guardar los cambios. Si subiste logo, intenta con una imagen más pequeña (máx. 300 KB).';
        return;
      }

      await this.prefillFromBackendProfile();
      this.selectedLogoBase64 = null;
      this.selectedLogoName = '';
      this.saveSuccess = 'Cambios guardados correctamente.';
    } catch {
      this.saveError = 'No se pudieron guardar los cambios. Si subiste logo, intenta con una imagen más pequeña (máx. 300 KB).';
    } finally {
      this.saving = false;
    }
  }

  cancelChanges(): void {
    this.profileForm.reset(this.initialFormValue);

    this.selectedLogoName = '';
  }

  private prefillFromSessionAndToken(): void {
    const authUser = this.auth.getCurrentUser();
    const keycloakUser = this.auth.getKeycloakUser();
    const claims = this.decodeJwtClaims(this.auth.token);

    this.profileForm.patchValue({
      commercialName: authUser?.companyName ?? '',
      businessEmail:
        authUser?.email ??
        keycloakUser?.email ??
        claims?.email ??
        claims?.preferred_username ??
        '',
    });

    this.captureInitialFormValue();
  }

  private async prefillFromBackendProfile(): Promise<void> {
    const token = this.auth.token;
    if (!token) return;

    const email =
      this.profileForm.value.businessEmail ||
      this.auth.getCurrentUser()?.email ||
      this.auth.getKeycloakUser()?.email ||
      null;

    try {
      const profile = await firstValueFrom(
        this.userProfileService.getCurrentUserProfile(token, email).pipe(timeout(15000))
      );
      if (!profile) {
        this.backendProfile = null;
        this.captureInitialFormValue();
        return;
      }

      this.backendProfile = profile;
      this.applyProfileToForm(profile);
      this.captureInitialFormValue();
    } catch (error) {
      console.error('[COMPANY-PROFILE] Error cargando perfil', error);
      this.captureInitialFormValue();
    }
  }

  private applyProfileToForm(profile: UserCompanyProfile): void {
    this.profileForm.patchValue({
      commercialName: profile.company_commercial_name ?? this.profileForm.value.commercialName ?? '',
      nit: profile.company_nit ?? '',
      businessEmail: profile.company_email ?? profile.email ?? this.profileForm.value.businessEmail ?? '',
      phone: profile.company_phone ?? '',
      mobile: profile.company_mobile ?? profile.phone ?? '',
      category: profile.company_category != null ? String(profile.company_category) : '',
      description: profile.company_description ?? '',
      address: profile.company_address ?? '',
      website: profile.company_website ?? '',
      mapsUrl: profile.company_map_url ?? '',
      facebook: profile.company_facebook ?? '',
      instagram: profile.company_instagram ?? '',
      x: profile.company_twitter ?? '',
      youtube: profile.company_youtube ?? '',
    });
  }

  private parseCategoryId(value: string | null | undefined): number | null {
    const parsed = Number(value ?? '');
    return Number.isFinite(parsed) ? parsed : null;
  }

  private captureInitialFormValue(): void {
    const rawValue = this.profileForm.getRawValue();

    this.initialFormValue = {
      commercialName: rawValue.commercialName ?? '',
      nit: rawValue.nit ?? '',
      businessEmail: rawValue.businessEmail ?? '',
      phone: rawValue.phone ?? '',
      mobile: rawValue.mobile ?? '',
      category: rawValue.category ?? '',
      description: rawValue.description ?? '',
      address: rawValue.address ?? '',
      website: rawValue.website ?? '',
      mapsUrl: rawValue.mapsUrl ?? '',
      facebook: rawValue.facebook ?? '',
      instagram: rawValue.instagram ?? '',
      x: rawValue.x ?? '',
      youtube: rawValue.youtube ?? '',
    };
  }

  private getEmptyFormValue(): CompanyProfileFormValue {
    return {
      commercialName: '',
      nit: '',
      businessEmail: '',
      phone: '',
      mobile: '',
      category: '',
      description: '',
      address: '',
      website: '',
      mapsUrl: '',
      facebook: '',
      instagram: '',
      x: '',
      youtube: ''
    };
  }

  private decodeJwtClaims(token: string | null): { email?: string; preferred_username?: string } | null {
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padLength = (4 - (normalized.length % 4)) % 4;
      const padded = normalized + '='.repeat(padLength);
      const decoded = atob(padded);

      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

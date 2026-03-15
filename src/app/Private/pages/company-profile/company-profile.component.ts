import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
  selectedLogoName = '';
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

    if (!file) {
      this.selectedLogoName = '';
      return;
    }

    this.selectedLogoName = file.name;
  }

  saveChanges(): void {
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      return;
    }

    console.log('[COMPANY-PROFILE] Datos del formulario', this.profileForm.value);
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
      const profile = await firstValueFrom(this.userProfileService.getCurrentUserProfile(token, email));
      if (!profile) {
        this.captureInitialFormValue();
        return;
      }

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
      mobile: profile.phone ?? '',
      description: profile.company_description ?? '',
      address: profile.company_address ?? '',
    });
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

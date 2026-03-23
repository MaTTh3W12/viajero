import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthService } from '../../../service/auth.service';
import { UserCompanyProfile, UserProfileService } from '../../../service/user-profile.service';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';

type CompanyProfileFormValue = {
  commercialName: string;
  nit: string;
  businessEmail: string;
  socialReason: string;
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

type CompanyProfileFormInput = {
  [K in keyof CompanyProfileFormValue]?: string | null;
};

interface CompanyCategoryOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TopbarComponent],
  templateUrl: './company-profile.component.html',
  styleUrl: './company-profile.component.css',
})
export class CompanyProfileComponent implements OnInit {
  private static readonly MAX_LOGO_FILE_SIZE_BYTES = 300 * 1024;
  private static readonly LOGO_SYNC_TIMEOUT_MS = 12000;
  private static readonly MIN_PHONE_DIGITS = 8;
  private static readonly MAX_PHONE_DIGITS = 15;
  private static readonly ALLOWED_LOGO_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
  ]);

  readonly minPhoneDigits = CompanyProfileComponent.MIN_PHONE_DIGITS;
  readonly maxPhoneDigits = CompanyProfileComponent.MAX_PHONE_DIGITS;

  selectedLogoName = '';
  private selectedLogoBase64: string | null = null;
  logoPreviewUrl = '';
  logoImageReady = false;
  logoChanged = false;
  logoLoading = false;
  logoSyncingAfterSave = false;
  logoRemoved = false;
  profileReady = false;
  showRemoveLogoModal = false;
  private backendProfile: UserCompanyProfile | null = null;
  saving = false;
  saveError = '';
  saveSuccess = '';
  showSaveSuccessOverlay = false;
  showSaveErrorOverlay = false;
  private saveWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private logoLoadPromise: Promise<void> | null = null;
  private initialFormValue: CompanyProfileFormValue = this.getEmptyFormValue();
  profileForm;

  categories: CompanyCategoryOption[] = [
    { id: 1, label: 'Alojamiento' },
    { id: 2, label: 'Alimentos y bebidas' },
    { id: 3, label: 'Turismo' },
    { id: 4, label: 'Entretenimiento' },
    { id: 5, label: 'Cuidado personal' },
    { id: 6, label: 'Productos nostálgicos' },
    { id: 7, label: 'Productos y servicios' },
    { id: 8, label: 'Tour operadores' },
    { id: 9, label: 'Transporte' },
  ];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private userProfileService: UserProfileService,
    private cdr: ChangeDetectorRef
  ) {
    this.profileForm = this.fb.group({
      commercialName: ['', Validators.required],
      nit: ['', Validators.required],
      businessEmail: ['', [Validators.required, Validators.email]],
      socialReason: [''],
      mobile: ['', [Validators.pattern(/^[0-9-]*$/), Validators.minLength(this.minPhoneDigits), Validators.maxLength(this.maxPhoneDigits)]],
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
    this.profileReady = false;
    this.prefillFromSessionAndToken();
    void this.prefillFromBackendProfile();
  }

  onLogoSelected(event: Event): void {
    if (this.isLogoBusy) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.saveError = '';
    this.saveSuccess = '';
    this.logoLoading = false;

    if (!file) {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      this.logoChanged = false;
      return;
    }

    const mimeType = String(file.type ?? '').toLowerCase();
    if (!CompanyProfileComponent.ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      this.logoChanged = false;
      input.value = '';
      this.saveError = 'Formato inválido. Solo se permiten JPG o PNG.';
      return;
    }

    if (file.size > CompanyProfileComponent.MAX_LOGO_FILE_SIZE_BYTES) {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      this.logoChanged = false;
      input.value = '';
      this.saveError = 'El logo excede el tamaño permitido (máximo 300 KB).';
      return;
    }

    this.selectedLogoName = file.name;
    this.logoRemoved = false;
    this.showRemoveLogoModal = false;
    this.logoLoading = true;

    const reader = new FileReader();
    reader.onerror = () => {
      this.selectedLogoName = '';
      this.selectedLogoBase64 = null;
      this.logoChanged = false;
      this.logoLoading = false;
      input.value = '';
      this.saveError = 'No se pudo leer el archivo de logo. Intenta nuevamente.';
      this.cdr.detectChanges();
    };
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const commaIndex = result.indexOf(',');
      this.selectedLogoBase64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : result;
      this.logoPreviewUrl = result;
      this.logoImageReady = false;
      this.logoChanged = true;
      this.logoLoading = false;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onLogoInputClick(event: Event): void {
    if (this.isLogoBusy) {
      event.preventDefault();
      return;
    }

    const input = event.target as HTMLInputElement;
    input.value = '';
  }

  onLogoImageError(): void {
    this.logoPreviewUrl = '';
    this.logoImageReady = false;
    this.cdr.detectChanges();
  }

  onLogoImageLoad(): void {
    this.logoImageReady = true;
    this.cdr.detectChanges();
  }

  openRemoveLogoModal(): void {
    if (this.isLogoBusy || !this.logoPreviewUrl) return;
    this.showRemoveLogoModal = true;
  }

  cancelRemoveLogo(): void {
    this.showRemoveLogoModal = false;
  }

  confirmRemoveLogo(): void {
    this.selectedLogoName = '';
    this.selectedLogoBase64 = null;
    this.logoPreviewUrl = '';
    this.logoImageReady = false;
    this.logoRemoved = true;
    this.logoChanged = true;
    this.showRemoveLogoModal = false;
    this.saveError = '';
    this.saveSuccess = '';
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const allowedChars = (input.value ?? '').replace(/[^0-9-]/g, '');
    input.value = allowedChars;
    this.profileForm.patchValue({ mobile: allowedChars }, { emitEvent: false });
  }

  get hasPendingChanges(): boolean {
    if (!this.profileReady) {
      return false;
    }

    if (this.logoRemoved || !!this.selectedLogoBase64) {
      return true;
    }

    const current = this.normalizeFormValue(this.profileForm.getRawValue());
    const initial = this.normalizeFormValue(this.initialFormValue);

    return JSON.stringify(current) !== JSON.stringify(initial);
  }

  get isLogoBusy(): boolean {
    return this.logoLoading || this.logoSyncingAfterSave || this.saving;
  }

  async saveChanges(): Promise<void> {
    this.saveError = '';
    this.saveSuccess = '';
    this.logoSyncingAfterSave = false;
    this.showSaveSuccessOverlay = false;
    this.showSaveErrorOverlay = false;
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
    this.startSaveWatchdog();

    const form = this.profileForm.getRawValue();
    const current = this.auth.getCurrentUser();
    const hadLogoRemovalRequest = this.logoRemoved;
    const hadLogoUploadRequest = !!this.selectedLogoBase64;
    const uploadedLogoPreview = hadLogoUploadRequest
      ? (this.normalizeLogoSource(this.logoPreviewUrl) ?? '')
      : '';
    const previousLogoPreview = this.normalizeLogoSource(this.logoPreviewUrl) ?? '';

    if (this.selectedLogoBase64 && this.selectedLogoBase64.length > 420000) {
      this.saveError = 'El logo seleccionado genera una carga demasiado grande. Usa una imagen más liviana.';
      this.saving = false;
      this.showSaveErrorOverlay = true;
      this.clearSaveWatchdog();
      return;
    }

    try {
      const nextCompanyLogoUrl = this.logoRemoved
        ? null
        : (this.selectedLogoBase64
            ? this.logoPreviewUrl
            : (this.backendProfile?.company_logo_url ?? null));

      const completed = await Promise.race<boolean>([
        this.auth.completeKeycloakCompanyProfile({
        company_commercial_name: form.commercialName || null,
        company_nit: form.nit || null,
        company_email: form.businessEmail || null,
        company_phone: form.mobile || null,
        company_mobile: this.backendProfile?.company_mobile ?? null,
        company_logo_url: nextCompanyLogoUrl,
        company_legal_name: form.socialReason || null,
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
        image: this.logoRemoved ? null : this.selectedLogoBase64,
        first_name: current?.firstName ?? null,
        last_name: current?.lastName ?? null,
        document_id: this.backendProfile?.document_id ?? null,
        document_type_id: this.backendProfile?.document_type_id ?? null,
        phone: this.backendProfile?.phone ?? null,
        country: this.backendProfile?.country ?? null,
        city: this.backendProfile?.city ?? null,
        }),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 25000)),
      ]);

      if (!completed) {
        this.saveError = 'No se pudieron guardar los cambios. Si subiste logo, intenta con una imagen más pequeña (máx. 300 KB).';
        this.showSaveErrorOverlay = true;
        return;
      }

      this.cacheSocialReason(form.socialReason ?? '');

      this.saving = false;
      this.clearSaveWatchdog();

      this.selectedLogoBase64 = null;
      this.selectedLogoName = '';
      this.logoRemoved = false;
      this.logoChanged = false;
      this.saveSuccess = 'Cambios guardados correctamente.';
      this.showSaveSuccessOverlay = true;

      if (hadLogoRemovalRequest || hadLogoUploadRequest) {
        this.logoSyncingAfterSave = true;
        await this.syncLogoAfterSave(previousLogoPreview, hadLogoRemovalRequest);

        const currentLogoPreview = this.normalizeLogoSource(this.logoPreviewUrl) ?? '';
        const backendReturnedStaleLogo =
          hadLogoUploadRequest &&
          !!uploadedLogoPreview &&
          (!currentLogoPreview || currentLogoPreview === previousLogoPreview);

        if (backendReturnedStaleLogo) {
          this.applyLogoPreview(uploadedLogoPreview);
          this.logoLoading = false;
          this.cdr.detectChanges();
        }
      } else {
        await this.prefillFromBackendProfile();
      }
    } catch {
      this.saveError = 'No se pudieron guardar los cambios. Si subiste logo, intenta con una imagen más pequeña (máx. 300 KB).';
      this.showSaveErrorOverlay = true;
    } finally {
      this.saving = false;
      this.logoSyncingAfterSave = false;
      this.clearSaveWatchdog();
      this.cdr.detectChanges();
    }
  }

  closeSaveSuccessOverlay(): void {
    this.showSaveSuccessOverlay = false;
  }

  closeSaveErrorOverlay(): void {
    this.showSaveErrorOverlay = false;
  }

  private startSaveWatchdog(): void {
    this.clearSaveWatchdog();
    this.saveWatchdogTimer = setTimeout(() => {
      if (!this.saving) return;
      this.saving = false;
      this.saveError = 'La operación tardó demasiado. Verifica tu conexión e intenta nuevamente.';
      this.showSaveErrorOverlay = true;
    }, 30000);
  }

  private clearSaveWatchdog(): void {
    if (!this.saveWatchdogTimer) return;
    clearTimeout(this.saveWatchdogTimer);
    this.saveWatchdogTimer = null;
  }

  cancelChanges(): void {
    this.profileForm.reset(this.initialFormValue);

    this.selectedLogoName = '';
    this.selectedLogoBase64 = null;
    this.logoRemoved = false;
    this.logoChanged = false;
    this.logoSyncingAfterSave = false;
    void this.requestLogoPreviewLoad(this.backendProfile?.id);
  }

  private async syncLogoAfterSave(previousLogoPreview: string, logoWasRemoved: boolean): Promise<void> {
    this.logoLoading = true;

    try {
      await Promise.race<void>([
        this.trySyncLogoAfterSave(previousLogoPreview, logoWasRemoved),
        this.delay(CompanyProfileComponent.LOGO_SYNC_TIMEOUT_MS),
      ]);
    } finally {
      this.logoLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async trySyncLogoAfterSave(previousLogoPreview: string, logoWasRemoved: boolean): Promise<void> {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.prefillFromBackendProfile();

      const currentLogoPreview = this.normalizeLogoSource(this.logoPreviewUrl) ?? '';
      const logoUpdated = logoWasRemoved
        ? !currentLogoPreview
        : !!currentLogoPreview && currentLogoPreview !== previousLogoPreview;

      if (logoUpdated) {
        return;
      }

      if (attempt < maxAttempts - 1) {
        await this.delay(900);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (!token) {
      this.profileReady = true;
      return;
    }

    const email =
      this.profileForm.value.businessEmail ||
      this.auth.getCurrentUser()?.email ||
      this.auth.getKeycloakUser()?.email ||
      null;
    const companyName =
      this.auth.getCurrentUser()?.companyName ??
      this.profileForm.value.commercialName ??
      null;

    try {
      const profile = await firstValueFrom(
        this.userProfileService.getCurrentCompanyProfile(token, email, companyName).pipe(timeout(15000))
      );
      if (!profile) {
        this.backendProfile = null;
        this.logoPreviewUrl = '';
        this.logoImageReady = false;
        this.captureInitialFormValue();
        this.profileReady = true;
        return;
      }

      const fallbackSocialReason =
        this.backendProfile?.company_legal_name ??
        this.readCachedSocialReason() ??
        null;

      const mergedProfile: UserCompanyProfile = {
        ...profile,
        company_legal_name: profile.company_legal_name ?? fallbackSocialReason,
      };

      this.cacheSocialReason(mergedProfile.company_legal_name ?? '');

      this.backendProfile = mergedProfile;
      this.applyProfileToForm(mergedProfile);
      if (!this.selectedLogoBase64 && !this.logoRemoved) {
        await this.requestLogoPreviewLoad(profile.id);
      }
      this.captureInitialFormValue();
      this.profileReady = true;
    } catch (error) {
      console.error('[COMPANY-PROFILE] Error cargando perfil', error);
      this.captureInitialFormValue();
      this.profileReady = true;
    }
  }

  private applyProfileToForm(profile: UserCompanyProfile): void {
    const fallbackSocialReason =
      this.backendProfile?.company_legal_name ??
      this.readCachedSocialReason() ??
      '';

    this.profileForm.patchValue({
      commercialName: profile.company_commercial_name ?? this.profileForm.value.commercialName ?? '',
      nit: profile.company_nit ?? '',
      businessEmail: profile.company_email ?? profile.email ?? this.profileForm.value.businessEmail ?? '',
      socialReason: profile.company_legal_name ?? fallbackSocialReason,
      mobile: profile.company_phone ?? '',
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

  private async requestLogoPreviewLoad(userId?: number | string): Promise<void> {
    if (this.selectedLogoBase64 || this.logoRemoved) {
      return;
    }

    if (this.logoLoadPromise) {
      await this.logoLoadPromise;
      return;
    }

    this.logoLoading = true;
    this.logoLoadPromise = this.loadCompanyLogoPreview(userId)
      .finally(() => {
        this.logoLoading = false;
        this.logoLoadPromise = null;
        this.cdr.detectChanges();
      });

    await this.logoLoadPromise;
  }

  private async loadCompanyLogoPreview(userId?: number | string): Promise<void> {
    if (this.selectedLogoBase64 || this.logoRemoved) {
      return;
    }

    const token = this.auth.token;
    if (!token) {
      return;
    }

    const profileId = String(userId ?? this.backendProfile?.id ?? '').trim();
    if (!profileId || !this.isUuid(profileId)) {
      this.applyLogoPreview(null);
      return;
    }

    if (this.backendProfile?.company_logo_url) {
      const logoUrl = this.normalizeLogoSource(this.backendProfile.company_logo_url);
      if (logoUrl) {
        this.applyLogoPreview(logoUrl);
        this.cdr.detectChanges();
        return;
      }
    }

    try {
      const logo = await firstValueFrom(
        this.userProfileService.getUserCompanyLogo(token, profileId).pipe(timeout(6000))
      );

      if (!logo?.company_logo_base64) {
        this.applyLogoPreview(null);
        return;
      }

      if (logo.company_logo_base64.startsWith('data:')) {
        this.applyLogoPreview(this.normalizeLogoSource(logo.company_logo_base64) ?? logo.company_logo_base64);
        this.cdr.detectChanges();
        return;
      }

      const mime = String(logo.company_logo_mime_type ?? 'image/png').replace(/^"+|"+$/g, '').trim() || 'image/png';
      this.applyLogoPreview(`data:${mime};base64,${logo.company_logo_base64}`);
      this.cdr.detectChanges();
    } catch {
      return;
    }
  }

  private applyLogoPreview(value: string | null | undefined): void {
    const nextLogo = this.normalizeLogoSource(value) ?? '';
    const currentLogo = this.normalizeLogoSource(this.logoPreviewUrl) ?? '';

    if (!nextLogo) {
      this.logoPreviewUrl = '';
      this.logoImageReady = false;
      return;
    }

    if (nextLogo === currentLogo) {
      return;
    }

    this.logoPreviewUrl = nextLogo;
    this.logoImageReady = false;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private normalizeLogoSource(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const normalizedRaw = raw.toLowerCase();
    if (normalizedRaw === 'null' || normalizedRaw === 'undefined' || normalizedRaw === 'n/a') {
      return null;
    }

    if (
      raw.startsWith('data:') ||
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('blob:') ||
      raw.startsWith('/')
    ) {
      return raw;
    }

    const compact = raw.replace(/\s/g, '');
    const looksLikeBase64 = compact.length >= 80 && /^[A-Za-z0-9+/=]+$/.test(compact);
    if (looksLikeBase64) {
      return `data:image/png;base64,${compact}`;
    }

    return raw;
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
      socialReason: rawValue.socialReason ?? '',
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
      socialReason: '',
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

  private normalizeFormValue(value: CompanyProfileFormInput): CompanyProfileFormValue {
    return {
      commercialName: String(value.commercialName ?? '').trim(),
      nit: String(value.nit ?? '').trim(),
      businessEmail: String(value.businessEmail ?? '').trim(),
      socialReason: String(value.socialReason ?? '').trim(),
      mobile: String(value.mobile ?? '').trim(),
      category: String(value.category ?? '').trim(),
      description: String(value.description ?? '').trim(),
      address: String(value.address ?? '').trim(),
      website: String(value.website ?? '').trim(),
      mapsUrl: String(value.mapsUrl ?? '').trim(),
      facebook: String(value.facebook ?? '').trim(),
      instagram: String(value.instagram ?? '').trim(),
      x: String(value.x ?? '').trim(),
      youtube: String(value.youtube ?? '').trim(),
    };
  }

  private getSocialReasonCacheKey(): string {
    const email =
      this.profileForm.value.businessEmail ||
      this.auth.getCurrentUser()?.email ||
      this.auth.getKeycloakUser()?.email ||
      'current-user';

    return `company_legal_name_cache:${String(email).trim().toLowerCase()}`;
  }

  private readCachedSocialReason(): string {
    const key = this.getSocialReasonCacheKey();

    try {
      const localValue = localStorage.getItem(key);
      if (localValue != null) return localValue;
    } catch {
      // Ignorar errores de almacenamiento local.
    }

    try {
      return sessionStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }

  private cacheSocialReason(value: string): void {
    const normalized = String(value ?? '').trim();

    try {
      const key = this.getSocialReasonCacheKey();
      if (!normalized) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        return;
      }

      localStorage.setItem(key, normalized);
      sessionStorage.setItem(key, normalized);
    } catch {
      // Ignorar errores de almacenamiento en navegadores restringidos.
    }
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

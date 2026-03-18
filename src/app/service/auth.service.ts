import { Injectable, inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { KeycloakService } from './keycloak.service';
import { UpsertCompanyVariables, UpsertUserVariables, UserCompanyProfile, UserProfileService } from './user-profile.service';

export type UserRole = 'admin' | 'empresa' | 'usuario';

export interface AuthUser {
  sub?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  companyName?: string;
  companyProfileCompleted?: boolean;
}

interface KeycloakToken {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface KeycloakUser {
  sub?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  role?: string;
}

interface HandleKeycloakRedirectOptions {
  upsert?: boolean;
  cleanUrl?: string;
}


interface HasuraJwtClaims {
  'x-hasura-role'?: string;
}

interface DecodedJwtPayload {
  sub?: string;
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  exp?: number;
  realm_access?: {
    roles?: string[];
  };
  'https://hasura.io/jwt/claims'?: HasuraJwtClaims;
}

const STORAGE_KEY = 'viajero_current_user';
const KC_TOKEN_KEY = 'viajero_kc_token';
const KC_ROLE_KEY = 'viajero_kc_role';
const KC_USER_KEY = 'viajero_kc_user';
const KC_CLIENT_KEY = 'kc_client';

const KC_CLIENTS = {
  login: 'viajero-frontend',
  user: 'viajero-frontend-user',
  company: 'viajero-frontend-company',
} as const;

const KEYCLOAK_CLIENT_IDS = new Set<string>(Object.values(KC_CLIENTS));

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private tokenExpiryTimer: ReturnType<typeof setTimeout> | null = null;

  private _token = new BehaviorSubject<string | null>(null);
  private _user = new BehaviorSubject<AuthUser | null>(null);
  private _sessionExpired = new BehaviorSubject<boolean>(false);

  token$ = this._token.asObservable();
  user$ = this._user.asObservable();
  sessionExpired$ = this._sessionExpired.asObservable();

  private users: (AuthUser & { password: string })[] = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'empresa', password: 'empresa123', role: 'empresa' },
    { username: 'usuario1', password: 'usuario123', role: 'usuario' },
  ];

  constructor(
    private kc: KeycloakService,
    private profile: UserProfileService
  ) {
    if (this.isBrowser()) {
      this._user.next(this.loadFromStorage());
      const storedToken = this.getKeycloakToken()?.access_token ?? null;
      this._token.next(storedToken);

      if (storedToken) {
        this.scheduleAutoLogoutFromToken(storedToken);
        void this.loadCompanyNameFromHasura(storedToken);
      }
    }
  }

  get token(): string | null {
    return this._token.value;
  }

  get user(): AuthUser | null {
    return this._user.value;
  }

  getCurrentUser(): AuthUser | null {
    return this._user.value;
  }

  getRole(): UserRole | null {
    return this._user.value?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this._user.value || this.isKeycloakLoggedIn();
  }

  isAdmin(): boolean {
    return this._user.value?.role === 'admin';
  }

  isEmpresa(): boolean {
    const role = String(this._user.value?.role ?? '').toLowerCase();
    return role === 'empresa' || role === 'company';
  }

  isUsuario(): boolean {
    return this._user.value?.role === 'usuario';
  }

  isKeycloakLoggedIn(): boolean {
    return !!this.getKeycloakToken()?.access_token;
  }

  isSessionExpired(): boolean {
    return this._sessionExpired.value;
  }

  clearSessionExpiredFlag(): void {
    this._sessionExpired.next(false);
  }

  isKeycloakUserFlow(): boolean {
    if (!this.isBrowser()) return false;
    return sessionStorage.getItem(KC_CLIENT_KEY) === KC_CLIENTS.user;
  }

  isKeycloakCompanyFlow(): boolean {
    if (!this.isBrowser()) return false;
    return sessionStorage.getItem(KC_CLIENT_KEY) === KC_CLIENTS.company;
  }

  getKeycloakRole(): string | null {
    if (!this.isBrowser()) return null;
    return sessionStorage.getItem(KC_ROLE_KEY);
  }

  getKeycloakUser(): KeycloakUser | null {
    if (!this.isBrowser()) return null;
    const raw = sessionStorage.getItem(KC_USER_KEY);
    return raw ? (JSON.parse(raw) as KeycloakUser) : null;
  }

  setAuth(token: string, user: AuthUser): void {
    this._token.next(token);
    this._user.next(user);
    this.saveToStorage(user);
  }

  login(username: string, password: string): AuthUser | null {
    const found = this.users.find(
      u => u.username === username && u.password === password
    );

    if (!found) return null;

    if (this.isBrowser()) {
      sessionStorage.removeItem(KC_TOKEN_KEY);
      sessionStorage.removeItem(KC_ROLE_KEY);
      sessionStorage.removeItem(KC_USER_KEY);
      sessionStorage.removeItem(KC_CLIENT_KEY);
    }

    const { password: _pwd, ...safeUser } = found;
    this._token.next(null);
    this._user.next(safeUser);
    this.saveToStorage(safeUser);
    return safeUser;
  }

  logout(): void {
    this.clearTokenExpiryTimer();
    this._token.next(null);
    this._user.next(null);

    if (!this.isBrowser()) return;

    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(KC_TOKEN_KEY);
    sessionStorage.removeItem(KC_ROLE_KEY);
    sessionStorage.removeItem(KC_USER_KEY);
  }

  clear(): void {
    this.logout();
  }

  keycloakLogin(): void {
    this.kc.login();
  }

  keycloakRegisterUser(): void {
    this.kc.registerUser();
  }

  keycloakRegisterCompany(): void {
    this.kc.registerCompany();
  }

  keycloakLogout(): void {
    const idTokenHint = this.getKeycloakToken()?.id_token;
    const clientId = this.isBrowser() ? (sessionStorage.getItem(KC_CLIENT_KEY) ?? undefined) : undefined;
    this.logout();
    this.kc.logout(clientId, idTokenHint);
  }

  shouldLogoutInKeycloak(): boolean {
    if (!this.isBrowser()) return false;

    const token = this.getKeycloakToken()?.access_token;
    const keycloakUser = this.getKeycloakUser();
    const currentUser = this._user.value;
    const sessionClient = sessionStorage.getItem(KC_CLIENT_KEY);

    return (
      !!token ||
      !!keycloakUser?.sub ||
      !!currentUser?.sub ||
      (sessionClient !== null && KEYCLOAK_CLIENT_IDS.has(sessionClient))
    );
  }

  async handleKeycloakRedirect(
    options: HandleKeycloakRedirectOptions = {}
  ): Promise<boolean> {
    if (!this.isBrowser()) return false;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return false;

    const tokenData = await this.kc.exchangeCode(code);
    if (!tokenData?.access_token) return false;

    this.saveKeycloakToken(tokenData);
    this.saveKeycloakIdentity(tokenData.access_token);
    void this.loadCompanyNameFromHasura(tokenData.access_token);

    const upsert = options.upsert ?? true;
    if (upsert) {
      try {
        await this.upsertUserInHasura(tokenData.access_token);
      } catch (error) {
        console.error('Error upserting Keycloak user in Hasura', error);
      }
    }

    const cleanUrl = options.cleanUrl ?? window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return true;
  }

  async completeKeycloakUserProfile(formData: {
    first_name: string;
    last_name: string;
    email: string;
    document_id: string | null;
    document_type_id: string | null;
    phone: string | null;
    country: string | null;
    city: string | null;
  }): Promise<boolean> {
    const token = this.getKeycloakToken()?.access_token;
    const user = this.getKeycloakUser();

    console.log('[AUTH] completeKeycloakUserProfile start', {
      hasToken: !!token,
      keycloakSub: user?.sub ?? null,
      keycloakUser: user,
      formData,
    });

    if (!token) {
      console.warn('[AUTH] completeKeycloakUserProfile aborted: missing token');
      return false;
    }

    try {
      const variables: UpsertUserVariables = {
        first_name: formData.first_name || user?.firstName || null,
        last_name: formData.last_name || user?.lastName || null,
        document_id: formData.document_id,
        document_type_id: formData.document_type_id,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
      };

      await firstValueFrom(this.profile.upsertUser(token, variables));
      return true;
    } catch (error) {
      console.error('Error completing Keycloak profile in Hasura', error);
      return false;
    }
  }


  async completeKeycloakCompanyProfile(formData: {
    company_commercial_name: string;
    company_nit: string;
    company_email: string;
    company_phone: string;
    company_mobile?: string | null;
    company_logo_url: string | null;
    company_description: string | null;
    company_address: string;
    company_category?: number | null;
    company_website?: string | null;
    company_map_url?: string | null;
    company_facebook?: string | null;
    company_instagram?: string | null;
    company_twitter?: string | null;
    company_youtube?: string | null;
    company_profile_completed: boolean;
    image?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    document_id?: string | null;
    document_type_id?: string | null;
    phone: string | null;
    country: string | null;
    city: string | null;
  }): Promise<boolean> {
    const token = this.getKeycloakToken()?.access_token;
    const user = this.getKeycloakUser();
    const current = this._user.value;

    console.log('[AUTH] completeKeycloakCompanyProfile start', {
      hasToken: !!token,
      keycloakSub: user?.sub ?? null,
      keycloakUser: user,
      formData,
    });

    if (!token) {
      console.warn('[AUTH] completeKeycloakCompanyProfile aborted: missing token');
      return false;
    }

    try {
      const variables: UpsertCompanyVariables = {
        company_commercial_name: formData.company_commercial_name,
        company_nit: formData.company_nit,
        company_email: formData.company_email,
        company_phone: formData.company_phone,
        company_mobile: formData.company_mobile ?? null,
        company_logo_url: formData.company_logo_url,
        company_description: formData.company_description,
        company_address: formData.company_address,
        company_category: formData.company_category ?? null,
        company_website: formData.company_website ?? null,
        company_map_url: formData.company_map_url ?? null,
        company_facebook: formData.company_facebook ?? null,
        company_instagram: formData.company_instagram ?? null,
        company_twitter: formData.company_twitter ?? null,
        company_youtube: formData.company_youtube ?? null,
        company_profile_completed: formData.company_profile_completed,
        image: formData.image ?? null,
        first_name: formData.first_name ?? user?.firstName ?? current?.firstName ?? null,
        last_name: formData.last_name ?? user?.lastName ?? current?.lastName ?? null,
        document_id: formData.document_id ?? null,
        document_type_id: formData.document_type_id ?? null,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
      };

      console.log('[AUTH] upsertCompany variables', variables);
      await firstValueFrom(this.profile.upsertCompany(token, variables));
      console.log('[AUTH] upsertCompany success');

      if (current) {
        const nextUser: AuthUser = {
          ...current,
          companyName: formData.company_commercial_name,
          companyProfileCompleted: true,
        };
        this._user.next(nextUser);
        this.saveToStorage(nextUser);
      }

      return true;
    } catch (error) {
      console.error('[AUTH] Error completing company profile in Hasura', error);
      return false;
    }
  }

  private saveToStorage(user: AuthUser): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private loadFromStorage(): AuthUser | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  private saveKeycloakToken(token: KeycloakToken): void {
    if (!this.isBrowser()) return;
    sessionStorage.setItem(KC_TOKEN_KEY, JSON.stringify(token));
    this._token.next(token.access_token ?? null);

    if (token.access_token) {
      this.scheduleAutoLogoutFromToken(token.access_token);
    }
  }

  private getKeycloakToken(): KeycloakToken | null {
    if (!this.isBrowser()) return null;
    const raw = sessionStorage.getItem(KC_TOKEN_KEY);
    return raw ? (JSON.parse(raw) as KeycloakToken) : null;
  }

  private saveKeycloakIdentity(accessToken: string): void {
    if (!this.isBrowser()) return;

    const payload = this.decodeJwt(accessToken);
    if (!payload) return;

    console.log('[AUTH] token claims check', {
      sub: payload.sub,
      preferred_username: payload.preferred_username,
      email: payload.email,
      given_name: payload.given_name,
      family_name: payload.family_name,
      has_given_name: !!payload.given_name,
      has_family_name: !!payload.family_name,
    });

    const realmRoles: string[] = payload.realm_access?.roles ?? [];
    const hasuraRole: string | undefined =
      payload['https://hasura.io/jwt/claims']?.['x-hasura-role'];

    const chosenRoleRaw = hasuraRole ?? this.firstUsefulRealmRole(realmRoles) ?? 'USER';
    sessionStorage.setItem(KC_ROLE_KEY, chosenRoleRaw);

    const normalizedRole = this.normalizeRole(chosenRoleRaw);

    const fullName = [payload.given_name, payload.family_name]
      .filter((value): value is string => !!value)
      .join(' ')
      .trim();

    const displayName = fullName || payload.preferred_username || payload.email || 'Usuario';

    const user: KeycloakUser = {
      sub: payload.sub,
      username: displayName,
      email: payload.email ?? payload.preferred_username,
      firstName: payload.given_name,
      lastName: payload.family_name,
      roles: realmRoles,
      role: chosenRoleRaw,
    };

    sessionStorage.setItem(KC_USER_KEY, JSON.stringify(user));

    const appUser: AuthUser = {
      sub: payload.sub,
      username: displayName,
      email: payload.email ?? payload.preferred_username,
      firstName: payload.given_name,
      lastName: payload.family_name,
      role: normalizedRole,
    };

    this.ngZone.run(() => this._user.next(appUser));
    this.saveToStorage(appUser);
  }

  private decodeJwt(token: string): DecodedJwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padLength = (4 - (normalized.length % 4)) % 4;
      const padded = normalized + '='.repeat(padLength);

      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const decoded = new TextDecoder('utf-8').decode(bytes);

      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  private firstUsefulRealmRole(roles: string[]): string | null {
    const ignore = new Set(['offline_access', 'uma_authorization', 'default-roles-viajero-realm']);
    return roles.find(r => !ignore.has(r)) ?? roles[0] ?? null;
  }

  private normalizeRole(raw?: string): UserRole {
    const role = (raw ?? '').toLowerCase();

    if (role.includes('admin')) return 'admin';
    if (role.includes('company') || role.includes('empresa')) return 'empresa';
    return 'usuario';
  }

  private async upsertUserInHasura(accessToken: string): Promise<void> {
    const payload = this.decodeJwt(accessToken);
    if (!payload || !payload.sub) return;

    const variables: UpsertUserVariables = {
      first_name: payload.given_name ?? null,
      last_name: payload.family_name ?? null,
      document_id: null,
      document_type_id: null,
      phone: null,
      country: null,
      city: null,
    };

    await firstValueFrom(this.profile.upsertUser(accessToken, variables));
  }


  private async loadCompanyNameFromHasura(accessToken: string): Promise<void> {
    const currentUser = this._user.value;
    if (!currentUser || currentUser.role !== 'empresa') return;

    try {
      const profile = await this.getCompanyProfileFromHasura(accessToken);
      this.applyCompanyNameToCurrentUser(profile);
    } catch (error) {
      console.error('Error loading company name from Hasura', error);
    }
  }

  async companyProfileNeedsCompletion(accessToken?: string): Promise<boolean> {
    const token = accessToken ?? this.getKeycloakToken()?.access_token ?? this._token.value;
    const currentUser = this._user.value;

    if (!token || !currentUser || currentUser.role !== 'empresa') {
      return false;
    }

    try {
      const profile = await this.getCompanyProfileFromHasura(token);
      this.applyCompanyNameToCurrentUser(profile);
      return !profile || profile.company_profile_completed !== true;
    } catch (error) {
      console.error('Error validating company profile completion', error);
      return false;
    }
  }

  private async getCompanyProfileFromHasura(accessToken: string): Promise<UserCompanyProfile | null> {
    const payload = this.decodeJwt(accessToken);
    const email = payload?.email ?? this._user.value?.email ?? this.getKeycloakUser()?.email ?? null;

    return firstValueFrom(this.profile.getCurrentUserProfile(accessToken, email));
  }

  private applyCompanyNameToCurrentUser(profile: UserCompanyProfile | null): void {
    const currentUser = this._user.value;
    if (!currentUser) return;

    const representativeName = [profile?.first_name, profile?.last_name]
      .filter((value): value is string => !!value)
      .join(' ')
      .trim();

    const companyName =
      profile?.company_commercial_name?.trim() ||
      representativeName ||
      currentUser.username;

    const nextUser: AuthUser = {
      ...currentUser,
      companyName,
      companyProfileCompleted: profile?.company_profile_completed === true,
    };

    this.ngZone.run(() => this._user.next(nextUser));
    this.saveToStorage(nextUser);
  }


  private scheduleAutoLogoutFromToken(accessToken: string): void {
    if (!this.isBrowser()) return;

    this.clearTokenExpiryTimer();

    const payload = this.decodeJwt(accessToken);
    const exp = Number(payload?.exp);

    if (!Number.isFinite(exp)) {
      console.warn('[AUTH] access token sin claim exp; no se programa auto-logout');
      return;
    }

    const expiresAtMs = exp * 1000;
    const remainingMs = expiresAtMs - Date.now();

    console.log('[AUTH] token expira en', this.formatDateTimeForElSalvador(expiresAtMs));

    if (remainingMs <= 0) {
      this.handleTokenExpired();
      return;
    }

    this.tokenExpiryTimer = setTimeout(() => {
      this.handleTokenExpired();
    }, remainingMs);
  }

  private clearTokenExpiryTimer(): void {
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
      this.tokenExpiryTimer = null;
    }
  }

  private handleTokenExpired(): void {
    this.logout();

    if (!this.isBrowser()) return;

    this._sessionExpired.next(true);
    console.log('[AUTH] sesión cerrada por expiración de token');
  }

  private formatDateTimeForElSalvador(timestamp: number): string {
    return new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(timestamp));
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}

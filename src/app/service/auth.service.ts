import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type UserRole = 'admin' | 'empresa' | 'usuario';

export interface AuthUser {
  username: string;
  role: UserRole;
  companyName?: string;
}

const STORAGE_KEY = 'viajero_current_user';
const KC_TOKEN_KEY = 'viajero_kc_token';
const KC_ROLE_KEY = 'viajero_kc_role';
const KC_USER_KEY = 'viajero_kc_user';

const KC_REALM = 'viajero-realm';
const KC_CLIENTS = {
  login: 'viajero-frontend',
  user: 'viajero-frontend-user',
  company: 'viajero-frontend-company',
} as const;

const KC_CLIENT_KEY = 'viajero_kc_client_id';
const DEFAULT_AUTH_DOMAIN = 'auth.grupoavanza.work';
const DEFAULT_HASURA_ENDPOINT = 'https://api.grupoavanza.work/v1/graphql';

declare global {
  interface Window {
    __ENV__?: {
      AUTH_DOMAIN?: string;
      HASURA_GRAPHQL_ENDPOINT?: string;
    };
  }
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
  username?: string;
  email?: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  // 🔧 usuarios mock
  private users: (AuthUser & { password: string })[] = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    {
      username: 'empresa1',
      password: 'empresa123',
      role: 'empresa',
      companyName: 'AO MEDIA'
    }
  ];

  private currentUser: AuthUser | null = this.loadFromStorage();

  /* ======================
     GETTERS
  ====================== */

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getRole(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isEmpresa(): boolean {
    return this.currentUser?.role === 'empresa';
  }

  isKeycloakLoggedIn(): boolean {
    return !!this.getKeycloakToken()?.access_token;
  }

  keycloakLogout(): void {
    if (!this.isBrowser()) return;
    sessionStorage.removeItem(KC_TOKEN_KEY);
    sessionStorage.removeItem(KC_ROLE_KEY);
    sessionStorage.removeItem(KC_USER_KEY);
    sessionStorage.removeItem(KC_CLIENT_KEY);

    const authBase = this.getAuthBase();
    const redirectUri = window.location.origin;
    window.location.href =
      `${authBase}/realms/${KC_REALM}/protocol/openid-connect/logout` +
      `?client_id=${KC_CLIENTS.login}` +
      `&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  getKeycloakRole(): string | null {
    return sessionStorage.getItem(KC_ROLE_KEY);
  }

  getKeycloakUser(): KeycloakUser | null {
    const raw = sessionStorage.getItem(KC_USER_KEY);
    return raw ? (JSON.parse(raw) as KeycloakUser) : null;
  }

  /* ======================
     KEYCLOAK ACTIONS
  ====================== */

  keycloakLogin(): void {
    this.redirectToKeycloak(KC_CLIENTS.login, 'auth');
  }

  keycloakRegisterUser(): void {
    this.redirectToKeycloak(KC_CLIENTS.user, 'registrations');
  }

  keycloakRegisterCompany(): void {
    this.redirectToKeycloak(KC_CLIENTS.company, 'registrations');
  }

  async handleKeycloakRedirect(): Promise<boolean> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return false;

    const token = await this.exchangeCodeForToken(code);
    if (!token) return false;

    this.saveKeycloakToken(token);
    this.saveKeycloakIdentity(token.access_token);
    await this.upsertUserInHasura(token.access_token);
    window.history.replaceState({}, document.title, this.getRedirectUri());
    return true;
  }

  async refreshKeycloakToken(): Promise<KeycloakToken | null> {
    const token = this.getKeycloakToken();
    if (!token?.refresh_token) return null;

    const clientId =
      sessionStorage.getItem(KC_CLIENT_KEY) ?? KC_CLIENTS.login;

    const res = await fetch(
      `${this.getAuthBase()}/realms/${KC_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: token.refresh_token,
        }),
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as KeycloakToken;
    this.saveKeycloakToken(data);
    return data;
  }

  /* ======================
     AUTH ACTIONS
  ====================== */

  login(username: string, password: string): AuthUser | null {
    const found = this.users.find(
      u => u.username === username && u.password === password
    );

    if (!found) return null;

    // ❌ no guardamos password
    const { password: _, ...safeUser } = found;

    this.currentUser = safeUser;
    this.saveToStorage(safeUser);

    return safeUser;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ======================
     STORAGE
  ====================== */

  private saveToStorage(user: AuthUser): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private loadFromStorage(): AuthUser | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  private getAuthBase(): string {
    if (!this.isBrowser()) return '';
    const scheme = window.location.protocol;
    const authDomain =
      window.__ENV__?.AUTH_DOMAIN ?? DEFAULT_AUTH_DOMAIN;
    return `${scheme}//${authDomain}`;
  }

  private getHasuraEndpoint(): string {
    if (!this.isBrowser()) return '';
    return window.__ENV__?.HASURA_GRAPHQL_ENDPOINT ?? DEFAULT_HASURA_ENDPOINT;
  }

  private getRedirectUri(): string {
    if (!this.isBrowser()) return '';
    return `${window.location.origin}/login`;
  }

  private buildKeycloakAuthUrl(
    endpoint: 'auth' | 'registrations',
    clientId: string
  ): string {
    const authBase = this.getAuthBase();
    const redirectUri = this.getRedirectUri();

    return (
      `${authBase}/realms/${KC_REALM}/protocol/openid-connect/${endpoint}` +
      `?client_id=${clientId}` +
      `&response_type=code` +
      `&scope=openid` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
  }

  private redirectToKeycloak(
    clientId: string,
    endpoint: 'auth' | 'registrations'
  ): void {
    if (!this.isBrowser()) return;
    sessionStorage.setItem(KC_CLIENT_KEY, clientId);
    window.location.href = this.buildKeycloakAuthUrl(endpoint, clientId);
  }

  private async exchangeCodeForToken(code: string): Promise<KeycloakToken | null> {
    const authBase = this.getAuthBase();
    const redirectUri = this.getRedirectUri();
    const clientId = sessionStorage.getItem(KC_CLIENT_KEY) ?? KC_CLIENTS.login;

    const res = await fetch(
      `${authBase}/realms/${KC_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!res.ok) return null;
    return (await res.json()) as KeycloakToken;
  }

  private saveKeycloakToken(token: KeycloakToken): void {
    if (!this.isBrowser()) return;
    sessionStorage.setItem(KC_TOKEN_KEY, JSON.stringify(token));
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

    const realmRoles: string[] = payload.realm_access?.roles ?? [];
    const hasuraRole: string | undefined =
      payload['https://hasura.io/jwt/claims']?.['x-hasura-role'];

    const role = hasuraRole ?? realmRoles[0] ?? '';
    if (role) sessionStorage.setItem(KC_ROLE_KEY, role);

    const user: KeycloakUser = {
      username: payload.preferred_username,
      email: payload.email,
      roles: realmRoles,
    };
    sessionStorage.setItem(KC_USER_KEY, JSON.stringify(user));
  }

  private decodeJwt(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private async upsertUserInHasura(accessToken: string): Promise<void> {
    if (!this.isBrowser()) return;
    const payload = this.decodeJwt(accessToken);
    if (!payload) return;

    const variables = {
      keycloak_id: payload.sub,
      email: payload.email ?? '',
      role:
        payload['https://hasura.io/jwt/claims']?.['x-hasura-role'] ??
        payload.realm_access?.roles?.[0] ??
        'USER',
      first_name: payload.given_name ?? null,
      last_name: payload.family_name ?? null,
      document_id: null,
      phone: null,
      country: null,
      city: null,
    };

    const query = `
      mutation UpsertUserFromJwt(
        $keycloak_id: uuid!,
        $email: String!,
        $role: String!,
        $first_name: String,
        $last_name: String,
        $document_id: String,
        $phone: String,
        $country: String,
        $city: String
      ) {
        insert_viajerosv_users(
          objects: {
            keycloak_id: $keycloak_id,
            email: $email,
            role: $role,
            first_name: $first_name,
            last_name: $last_name,
            document_id: $document_id,
            phone: $phone,
            country: $country,
            city: $city,
            active: true
          },
          on_conflict: {
            constraint: users_keycloak_id_key,
            update_columns: [email, first_name, last_name, document_id, phone, country, city, updated_at]
          }
        ) {
          affected_rows
        }
      }
    `;

    await fetch(this.getHasuraEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  }
}

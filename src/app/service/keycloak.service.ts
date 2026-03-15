import { Injectable } from '@angular/core';

const REALM = 'viajero-realm';

const CLIENTS = {
  login: 'viajero-frontend',
  user: 'viajero-frontend-user',
  company: 'viajero-frontend-company'
};

const KC_CLIENT_KEY = 'kc_client';
const KC_REDIRECT_URI_KEY = 'kc_redirect_uri';
const DEFAULT_AUTH_DOMAIN = 'auth.grupoavanza.work';

interface RedirectOptions {
  prompt?: 'login' | 'none' | 'consent' | 'select_account';
  maxAge?: number;
}

declare global {
  interface Window {
    __ENV__?: {
      AUTH_DOMAIN?: string;
      HASURA_GRAPHQL_ENDPOINT?: string;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class KeycloakService {
  private get authBase() {
    const authDomain = window.__ENV__?.AUTH_DOMAIN ?? DEFAULT_AUTH_DOMAIN;
    return `${window.location.protocol}//${authDomain}`;
  }

  private get redirectUriBase() {
    return window.location.origin;
  }

  login() {
    this.redirect(CLIENTS.login, 'auth', '/login', {
      prompt: 'login',
      maxAge: 0,
    });
  }

  registerUser() {
    this.redirect(CLIENTS.user, 'registrations', '/register?type=user');
  }

  registerCompany() {
    this.redirect(CLIENTS.company, 'registrations', '/register?type=company');
  }

  logout(clientId?: string, idTokenHint?: string) {
    const activeClientId = clientId ?? sessionStorage.getItem(KC_CLIENT_KEY) ?? CLIENTS.login;
    const params = new URLSearchParams({
      client_id: activeClientId,
      post_logout_redirect_uri: this.redirectUriBase
    });

    if (idTokenHint) {
      params.set('id_token_hint', idTokenHint);
    }

    window.location.href = `${this.authBase}/realms/${REALM}/protocol/openid-connect/logout?${params.toString()}`;
  }

  private redirect(clientId: string, endpoint: string, path: string, options: RedirectOptions = {}) {
    const redirectUri = `${this.redirectUriBase}${path}`;

    sessionStorage.setItem(KC_CLIENT_KEY, clientId);
    sessionStorage.setItem(KC_REDIRECT_URI_KEY, redirectUri);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: redirectUri,
    });

    if (options.prompt) {
      params.set('prompt', options.prompt);
    }

    if (typeof options.maxAge === 'number') {
      params.set('max_age', String(options.maxAge));
    }

    window.location.href = `${this.authBase}/realms/${REALM}/protocol/openid-connect/${endpoint}?${params.toString()}`;
  }

  async exchangeCode(code: string) {
    const clientId = sessionStorage.getItem(KC_CLIENT_KEY) ?? CLIENTS.login;
    const redirectUri = sessionStorage.getItem(KC_REDIRECT_URI_KEY) ?? `${window.location.origin}${window.location.pathname}`;

    const res = await fetch(
      `${this.authBase}/realms/${REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: redirectUri,
        })
      }
    );

    if (!res.ok) return null;
    return await res.json();
  }
}

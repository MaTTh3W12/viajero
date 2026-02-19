import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
import { UpsertUserVariables, UserProfileService } from './user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthFacadeService {
  constructor(
    private kc: KeycloakService,
    private state: AuthService,
    private profile: UserProfileService,
    private router: Router
  ) {}

  login() {
    this.kc.login();
  }

  registerUser() {
    this.kc.registerUser();
  }

  registerCompany() {
    this.kc.registerCompany();
  }

  async handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const tokenData = await this.kc.exchangeCode(code);
    if (!tokenData) return;

    const payload = this.decode(tokenData.access_token);

    this.state.setAuth(tokenData.access_token, {
      sub: payload.sub,
      email: payload.email,
      username: payload.preferred_username,
      firstName: payload.given_name,
      lastName: payload.family_name,
      role: payload.realm_access?.roles?.[0],
    });

    window.history.replaceState({}, document.title, window.location.pathname);
  }

  async completeProfile(formData: Partial<UpsertUserVariables>) {
    const token = this.state.token;
    const user = this.state.user;

    if (!token || !user) return;

    if (!user.sub || !user.role) return;

    const variables: UpsertUserVariables = {
      keycloak_id: user.sub,
      email: user.email ?? '',
      role: user.role,
      first_name: (formData.first_name ?? user.firstName) ?? null,
      last_name: (formData.last_name ?? user.lastName) ?? null,
      document_id: formData.document_id ?? null,
      phone: formData.phone ?? null,
      country: formData.country ?? null,
      city: formData.city ?? null,
    };

    await firstValueFrom(this.profile.upsertUser(token, variables));

    this.router.navigate(['/']);
  }

  logout() {
    this.state.clear();
    this.kc.logout();
  }

  private decode(token: string) {
    return JSON.parse(atob(token.split('.')[1]));
  }
}

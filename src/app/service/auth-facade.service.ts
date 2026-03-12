import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UpsertUserVariables, UserProfileService } from './user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthFacadeService {
  constructor(
    private state: AuthService,
    private profile: UserProfileService,
    private router: Router
  ) {}

  login() {
    this.state.keycloakLogin();
  }

  registerUser() {
    this.state.keycloakRegisterUser();
  }

  registerCompany() {
    this.state.keycloakRegisterCompany();
  }

  async handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    await this.state.handleKeycloakRedirect({ upsert: false });
  }

  async completeProfile(formData: Partial<UpsertUserVariables>) {
    const token = this.state.token;
    const user = this.state.user;

    if (!token || !user) return;

    const variables: UpsertUserVariables = {
      first_name: (formData.first_name ?? user.firstName) ?? null,
      last_name: (formData.last_name ?? user.lastName) ?? null,
      document_id: formData.document_id ?? null,
      document_type_id: formData.document_type_id ?? null,
      phone: formData.phone ?? null,
      country: formData.country ?? null,
      city: formData.city ?? null,
    };

    await firstValueFrom(this.profile.upsertUser(token, variables));

    this.router.navigate(['/']);
  }

  logout() {
    if (this.state.shouldLogoutInKeycloak()) {
      this.state.keycloakLogout();
      return;
    }

    this.state.clear();
  }
}

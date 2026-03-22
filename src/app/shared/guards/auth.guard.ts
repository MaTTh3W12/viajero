import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

// Guard que permite solo administradores en /admin
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    auth.keycloakLogin(state.url);
    return false;
  }

  if (auth.isAdmin()) {
    return true;
  }

  router.navigate(['/']); // o página no autorizada
  return false;
};

// Guard que permite solo empresas en /company
export const empresaGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    auth.keycloakLogin(state.url);
    return false;
  }

  if (auth.isEmpresa()) {
    return auth.companyProfileNeedsCompletion().then(async (needsProfileCompletion) => {
      console.info('[GUARD][EMPRESA] companyProfileNeedsCompletion =>', needsProfileCompletion);
      if (needsProfileCompletion) {
        router.navigate(['/register'], { queryParams: { type: 'company' } });
        return false;
      }

      const isCompanyActive = await auth.companyAccountIsActive();
      console.info('[GUARD][EMPRESA] companyAccountIsActive =>', isCompanyActive);
      if (!isCompanyActive) {
        router.navigate(['/login'], { queryParams: { companyInactive: '1' } });
        return false;
      }

      return true;
    });
  }

  router.navigate(['/']); // o página no autorizada
  return false;
};

export const usuarioGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    auth.keycloakLogin(state.url);
    return false;
  }

  if (auth.isUsuario()) {
    return auth.userProfileNeedsCompletion().then((needsProfileCompletion) => {
      if (needsProfileCompletion) {
        router.navigate(['/register'], { queryParams: { type: 'user' } });
        return false;
      }

      return true;
    });
  }

  router.navigate(['/']);
  return false;
};

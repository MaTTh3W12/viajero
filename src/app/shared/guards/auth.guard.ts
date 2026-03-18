import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

// Guard que permite solo administradores en /admin
export const adminGuard: CanActivateFn = () => {
const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.isAdmin()) {
    return true;
  }

  router.navigate(['/']); // o página no autorizada
  return false;
};

// Guard que permite solo empresas en /company
export const empresaGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.isEmpresa()) {
    const needsProfileCompletion = await auth.companyProfileNeedsCompletion();

    if (needsProfileCompletion) {
      router.navigate(['/register'], { queryParams: { type: 'company' } });
      return false;
    }

    return true;
  }

  router.navigate(['/']); // o página no autorizada
  return false;
};

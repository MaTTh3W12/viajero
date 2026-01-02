import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

// Guard que permite solo administradores en /admin
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.getCurrentUser();

  if (user && user.role === 'admin') {
    return true;
  }

  // Si no está logueado o no es admin, lo mandamos al login
  router.navigate(['/login']);
  return false;
};

// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../pages/service/auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1️⃣ Comprueba que esté logueado
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(
      ['/auth/login'],
      { queryParams: { returnUrl: state.url } }
    );
  }

  // 2️⃣ Extrae el rol del usuario y los roles permitidos en la ruta
  const userRole = auth.getUserRole();
  const allowedRoles = route.data['roles'] as string[] | undefined;

  // 3️⃣ Si no hay restricción de roles o el rol coincide, permite
  if (allowedRoles && allowedRoles.includes(userRole!)) {
    return true;
  }

  // 4️⃣ Rol no permitido → redirige (puedes crear un componente “/unauthorized”)
  return router.createUrlTree(['/auth/login']);
};

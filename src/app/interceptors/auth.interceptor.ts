import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpEvent,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../pages/service/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

   constructor(private auth: AuthService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    // Si hay token, clonar la petición y agregar Authorization
    if (token && !req.url.includes('/auth/api')) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq);
    }
    // Si no hay token, enviar la petición tal cual
    return next.handle(req);
  }
}

// Proveedor para inyectar varios interceptores (solo este de momento)
export const authInterceptorProviders = [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  }
];

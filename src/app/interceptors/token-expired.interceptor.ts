// token-expired.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../pages/service/auth.service';

@Injectable()
export class TokenExpiredInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {

        console.log('Token expired or invalid', err.status);

        if (err.status === 401) {
          // Token expirado o inválido
          this.auth.logout();               // limpia localStorage
          this.router.navigate(['/auth/login']); // redirige al login
        }
        return throwError(() => err);
      })
    );
  }
}

import { Injectable } from '@angular/core';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { VerifyCodeResponse } from '../../models/verifyCodeResponse';
import { ResendCodeResponse } from '../../models/resendCodeResponse';
import { UserPayload } from '../../models/selllerPayload';
import { CreateSellerResponse } from '../../models/create-seller-response';

interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  private readonly frontUrl = environment.frontUrl;
  private readonly backUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) { }

  createClient(payload: UserPayload): Observable<string> {
    return this.http.post<CreateSellerResponse>(`${this.apiUrl}/register`, payload).pipe(
      map(response => response.token),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    // Puedes extender esto para leer mensajes específicos del backend
    console.log('Error M: ', error?.error?.message ?? 'Error desconocido');
    return throwError(() => new Error(error?.error?.message ?? 'Error desconocido'));
  }

  /** Envía email y password, devuelve el token en el observable */
  login(email: string, password: string): Observable<string> {
    const url = `${this.apiUrl}/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      map(response => response.token),
      catchError(this.loginHandleError)
    );
  }

  private loginHandleError(error: HttpErrorResponse) {
    // Puedes extender esto para leer mensajes específicos del backend
    return throwError(() => new Error('Usuario o contraseña inválidos'));
  }

  verifyCode(userId: string, code: string): Observable<VerifyCodeResponse> {
    const url = `${this.apiUrl}/verify-code`;
    return this.http.post<VerifyCodeResponse>(url, { userId, code }).pipe(
      map(response => response),
      catchError(this.verifyCodeHandleError)
    );
  }

  sendVerificationCode(userId: string): Observable<ResendCodeResponse> {
    const url = `${this.apiUrl}/resend-code`;
    return this.http.post<ResendCodeResponse>(url, { userId, frontUrl: this.frontUrl, backUrl: this.backUrl }).pipe(
      map(response => response),
      catchError(this.verifyCodeHandleError)
    );
  }

  private verifyCodeHandleError(error: HttpErrorResponse) {
    // Puedes extender esto para leer mensajes específicos del backend
    return throwError(() => new Error('Ocurrió un error por favor intentar mas tarde'));
  }

  getValueFromToken(claim: string): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload[claim] ?? null;
    } catch {
      return '';
    }
  }
}

import { Injectable } from '@angular/core';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  /** Envía email y password, devuelve el token en el observable */
  login(email: string, password: string): Observable<string> {
    const url = `${this.baseUrl}/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      map(response => response.token),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    // Puedes extender esto para leer mensajes específicos del backend
    return throwError(() => new Error('Usuario o contraseña inválidos'));
  }

  getRole(): 'buyer' | 'seller' | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role ?? null;
    } catch {
      return null;
    }
  }
}

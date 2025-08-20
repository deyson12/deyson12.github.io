import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GenericResponse } from '../../models/genericResponse';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  
  private readonly apiUrl = `${environment.apiUrl}/api/logs`;

  constructor(private readonly http: HttpClient) { }

  log(code: string, context: any): Observable<GenericResponse> {
    return this.http.post<GenericResponse>(`${this.apiUrl}`, { code, context });
  }
}

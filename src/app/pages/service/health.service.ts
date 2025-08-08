import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HealthService {

  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}

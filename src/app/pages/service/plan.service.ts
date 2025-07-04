import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Plan } from '../../models/plan';

@Injectable({
  providedIn: 'root'
})
export class PlanService {

  private readonly apiUrl = `${environment.apiUrl}/api/plans`;

  constructor(private readonly http: HttpClient) { }

  getPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(this.apiUrl);
  }
}
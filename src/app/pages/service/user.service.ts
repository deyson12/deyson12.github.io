import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user';
import { GenericResponse } from '../../models/genericResponse';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  
  private readonly apiUrl = `${environment.apiUrl}/api/users`;

  constructor(private readonly http: HttpClient) { }

  getUsers(): Observable<User[]> {
    let url = this.apiUrl;
    return this.http.get<User[]>(url);
  }

  getUserById(userId: string): Observable<User> {
    let url = `${this.apiUrl}/:userId`.replace(':userId', userId);
    return this.http.get<User>(url);
  }

  changeStatus(id: string, status: string): Observable<GenericResponse> {
    return this.http.put<GenericResponse>(`${this.apiUrl}/change-status/${id}`, { status });
  }

  updateUser(userId: string, arg1: { name: string; phone: string; }) {
    let url = `${this.apiUrl}/:userId`.replace(':userId', userId);
    return this.http.put(url, arg1);
  }
}

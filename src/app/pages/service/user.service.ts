import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly apiUrl = `${environment.apiUrl}/api/users`;

  constructor(private http: HttpClient) { }

  /** Obtiene solo las categorías activas, ordenadas */
  getUserById(userId: string): Observable<User> {
    let url = `${this.apiUrl}/:userId`.replace(':userId', userId);
    return this.http.get<User>(url);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Category } from '../../models/category';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private readonly apiUrl = `${environment.apiUrl}/api/categories`;

  constructor(private http: HttpClient) {}

  /** Obtiene todas las categorías */
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  /** Obtiene solo las categorías activas, ordenadas */
  getActiveCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/active`);
  }
}
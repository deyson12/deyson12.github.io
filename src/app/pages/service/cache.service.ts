import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly apiUrl = `${environment.apiUrl}/api/cache`;

  constructor(private http: HttpClient) {}

  // 1. Obtener todos los nombres de cache
  getCacheNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}`);
  }

  // 2. Obtener todas las entries (objecto key → array de items)
  getEntries(cacheName: string): Observable<Record<string, any[]>> {
    console.log('Cachename:', cacheName);
    return this.http.get<Record<string, any[]>>(`${this.apiUrl}/${cacheName}/entries`);
  }

  // 3. Obtener solo las entries de una key concreta
  getEntriesByKey(cacheName: string, key: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${cacheName}/entries/${key}`);
  }

  // 4a. Borrar una sola entry (key)
  clearEntry(cacheName: string, key: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cacheName}/entries/${key}`);
  }

  // 4b. Borrar todas las entries de un cache
  clearCache(cacheName: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cacheName}`);
  }

  // 4c. Borrar todos los caches
  clearAll(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}`);
  }
}
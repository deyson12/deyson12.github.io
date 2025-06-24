import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Banner } from '../../models/banner';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BannerService {

  private readonly apiUrl = `${environment.apiUrl}/api/banners`;

  constructor(private readonly http: HttpClient) { }

  getBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(this.apiUrl);
  }

  getBannersByCategory(categoryCode: string): Observable<Banner[]> {
    const url = `${this.apiUrl}/category/:categoryCode`.replace(':categoryCode', categoryCode);
    return this.http.get<Banner[]>(url);
  }
}

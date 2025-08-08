import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

export interface ZoneResponse {
  id: string;
  name: string;
  description: string;
  polygon: { lat: number; lng: number }[];
  createdAt: string;
  priority: number;
  deliveryPrice?: number; // Puede ser undefined si no se ha establecido
}


@Injectable({
  providedIn: 'root'
})
export class CoverageZonesService {

  private readonly apiUrl = `${environment.apiUrl}/api/zones`;

  constructor(private readonly http: HttpClient) { }

  getCoverageZones(): Observable<ZoneResponse[]> {
    return this.http.get<ZoneResponse[]>(this.apiUrl);
  }

  getCoverageZonesBySeller(sellerId: string): Observable<ZoneResponse[]> {
    return this.http.get<ZoneResponse[]>(`${this.apiUrl}/seller/${sellerId}`);
  }

  assignZone(sellerId: string, id: any, deliveryPrice: number = 0): Observable<any> {
    return this.http.post(`${this.apiUrl}/seller/${sellerId}`, { id, deliveryPrice });
  }

  removeZone(sellerId: string, id: any) {
    return this.http.delete(`${this.apiUrl}/seller/${sellerId}/${id}`).pipe(
      catchError((error) => {
        console.error('Error removing zone:', error);
        return throwError(() => new Error('Failed to remove zone'));
      })
    );
  }

  getDeliveryPrice(location: [number, number], sellerId: string): Observable<ZoneResponse> {
    return this.http.get<ZoneResponse>(`${this.apiUrl}/seller/${sellerId}/delivery-price/${location[0]}/${location[1]}`);
  }
}

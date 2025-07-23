import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AvailabilityMap, SellerAvailabilityDto } from '../../models/availabilityMap';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly baseUrl = `${environment.apiUrl}/api/sellers`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la disponibilidad del vendedor
   * @param sellerId UUID del vendedor
   */
  getAvailability(sellerId: string): Observable<SellerAvailabilityDto[]> {
    return this.http.get<SellerAvailabilityDto[]>(`${this.baseUrl}/${sellerId}/availability`);
  }

  /**
   * Guarda la disponibilidad del vendedor
   * @param sellerId UUID del vendedor
   * @param availability Mapa de disponibilidad
   */
  saveAvailability(sellerId: string, availability: AvailabilityMap): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${sellerId}/availability`, availability);
  }
}

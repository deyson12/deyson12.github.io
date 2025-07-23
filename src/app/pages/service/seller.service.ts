import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UserPayload } from '../../models/selllerPayload';
import { environment } from '../../../environments/environment';
import { CreateSellerResponse } from '../../models/create-seller-response';
import { User } from '../../models/user';
import { SalesSummary } from '../../models/salesSummary';
import { SalesLastMonths } from '../../models/salesLastMonths';
import { ProductSales } from '../../models/productSales';

@Injectable({
  providedIn: 'root'
})
export class SellerService {

  private readonly apiAuthUrl = `${environment.apiUrl}/api/auth`;
  private readonly apUrl = `${environment.apiUrl}/api/sellers`;

  constructor(private readonly http: HttpClient) { }

  getSalesSumary(sellerId: string): Observable<SalesSummary> {
    return this.http.get<SalesSummary>(`${this.apUrl}/${sellerId}/sales-summary`).pipe(
      catchError(this.handleError)
    );
  }

  getSalesLastMonths(sellerId: string): Observable<SalesLastMonths[]> {
    return this.http.get<SalesLastMonths[]>(`${this.apUrl}/${sellerId}/revenue-last-months`).pipe(
      catchError(this.handleError)
    );
  }

  getSalesByProductLastMonths(sellerId: string): Observable<ProductSales> {
    return this.http.get<ProductSales>(`${this.apUrl}/${sellerId}/sales-by-product-last-months`).pipe(
      catchError(this.handleError)
    );
  }

  createSeller(payload: UserPayload): Observable<string> {
    return this.http.post<CreateSellerResponse>(`${this.apiAuthUrl}/activate-req`, payload).pipe(
      map(response => response.token),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    // Puedes extender esto para leer mensajes específicos del backend
    console.log('Error M: ', error?.error?.message ?? 'Error desconocido');
    return throwError(() => new Error(error?.error?.message ?? 'Error desconocido'));
  }

  /** Actualiza el perfil del vendedor y retorna el objeto actualizado */
  updateSeller(sellerId: string, updated: User): Observable<String> {
    return this.http.patch<CreateSellerResponse>(`${this.apiAuthUrl}/update/${sellerId}`, updated).pipe(
      map(response => response.token),
      catchError(this.handleError)
    );
  }

  /** Simula subida de imagen y retorna la URL resultante */
  uploadProfileImage(file: File): Observable<string> {
    // En un caso real harías un POST a un endpoint de archivos.
    const mockUrl = 'https://via.placeholder.com/150';
    return of(mockUrl);
  }
}

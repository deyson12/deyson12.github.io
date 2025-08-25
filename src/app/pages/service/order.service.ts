import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Order } from '../../models/order';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ConfirmOrderResponse } from '../../models/confirmOrderResponse';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private readonly apiUrl = `${environment.apiUrl}/api/orders`;

  constructor(private readonly http: HttpClient) { }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  getPendingOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/status/PENDIENTE`);
  }

  getOrdersBySellerAndDate(sellerId: string, date: Date): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/seller/${sellerId}/month/${date.toISOString().split('T')[0]}`);
  }

  confirmOrder(orderId: string, userId: string): Observable<ConfirmOrderResponse> {
    return this.http.post<ConfirmOrderResponse>(`${this.apiUrl}/${orderId}/confirm`, { userId }).pipe(
      map(response => response),
      catchError(this.handleConfirmError)
    );
  }

  cancelOrder(orderId: string, userId: string, reason: string): Observable<ConfirmOrderResponse> {
    return this.http.post<ConfirmOrderResponse>(`${this.apiUrl}/${orderId}/cancel`, { userId, reason }).pipe(
      map(response => response),
      catchError(this.handleCancelError)
    );
  }

  private handleConfirmError(error: HttpErrorResponse) {
    return throwError(() => new Error('Ocurrió un error confirmando la orden'));
  }

  private handleCancelError(error: HttpErrorResponse) {
    return throwError(() => new Error('Ocurrió un error cancelando la orden'));
  }

 } 


import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Invoice } from '../../models/invoice';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly apiUrl = `${environment.apiUrl}/api/invoices`;

  constructor(private http: HttpClient) {}

  getInvoices(year: number, month: number): Observable<Invoice[]> {
    const params = new HttpParams()
      .set('year',  year.toString())
      .set('month', month.toString());
    return this.http.get<Invoice[]>(this.apiUrl, { params });
  }

  getInvoicesBySeller(year: number, month: number, sellerId: string): Observable<Invoice[]> {
    const params = new HttpParams()
      .set('year',  year.toString())
      .set('month', month.toString());
    return this.http.get<Invoice[]>(`${this.apiUrl}/${sellerId}`, { params });
  }
}
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { CreateProductResponse } from '../../models/create-product-response';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly apiUrl = `${environment.apiUrl}/api/products`;

  lat = 0;
  lng = 0;

  constructor(
    private readonly http: HttpClient
  ) {
    this.lat = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').latitude : 0;
    this.lng = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').longitude : 0;
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Ocurrió un error al obtener el producto'));
      })
    );
  }

  saveOrUpdateProduct(product: Product): Observable<string> {
    return this.http.post<CreateProductResponse>(`${this.apiUrl}/saveOrUpdate`, product).pipe(
      map(response => response.token),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => new Error('Ocurrió un error creando el producto'));
  }

  /** Obtiene todas las categorías */
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl, { params: { lat: this.lat, lng: this.lng } });
  }

  getAllProductsByQuery(query: string): Observable<Product[]> {
    // Busca productos por nombre, descripción o categoría
    return this.http.get<Product[]>(`${this.apiUrl}/search/${query}`, { params: { lat: this.lat, lng: this.lng } }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching products by query:', error);
        return throwError(() => new Error('Ocurrió un error al buscar productos'));
      })
    );
  }

  getAllProductsByQueryWithoutLimits(query: string): Observable<Product[]> {

    const limit = -1;

    return this.http.get<Product[]>(`${this.apiUrl}/search/${query}`, { params: { limit, lat: this.lat, lng: this.lng  } }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching products by query:', error);
        return throwError(() => new Error('Ocurrió un error al buscar productos'));
      })
    );
  }

  /** Obtiene solo las categorías activas, ordenadas */
  getProductsByCategory(categoryCode: string): Observable<Product[]> {

    let url = '';
    if (categoryCode === 'all') {
      url = `${this.apiUrl}`;
    } else {
      url = `${this.apiUrl}/category/:categoryCode`.replace(':categoryCode', categoryCode);
    }
    return this.http.get<Product[]>(url, { params: { lat: this.lat, lng: this.lng } });
  }

  getFeaturedProductsByCategory(categoryCode: string): Observable<Product[]> {

    let url = '';
    if (categoryCode === 'all') {
      url = `${this.apiUrl}/featured`;
    } else {
      url = `${this.apiUrl}/featured/category/:categoryCode`.replace(':categoryCode', categoryCode);
    }
    return this.http.get<Product[]>(url, { params: { lat: this.lat, lng: this.lng } });
  }

  getDiscount(product: Product): string {

    const price = product.price;
    const originalPrice = product.originalPrice;

    if (!product || price === undefined || originalPrice === undefined || originalPrice == null || originalPrice <= 0) {
      return '0%';
    }

    const discount = ((originalPrice - price) / originalPrice) * 100;
    return discount.toFixed(0) + '%';
  }

  getSalesDetail(sales: number | undefined): string {
    //Retorna el numero de ventas en caso de que sea mayor a 0 y menor a 100
    //Si es mayor a 100 y menor de 1000 retorna el string '100+'
    //Si es mayor a 1000 retorna el string '1000+'
    //Si es menor a 0 o undefined retorna el string '0'
    if (sales === undefined || sales < 0) {
      return '0';
    } else if (sales > 0 && sales < 100) {
      return sales + '';
    } else if (sales >= 100 && sales < 1000) {
      return '100+';
    } else {
      return '1000+';
    }
  }

  getProductsBySellerId(sellerId: string): Observable<Product[]> {
    let url = `${this.apiUrl}/seller/:sellerId`.replace(':sellerId', sellerId);
    return this.http.get<Product[]>(url);
  }

  /** Elimina un producto por su ID */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting product:', error);
        return throwError(() => new Error('Ocurrió un error al eliminar el producto'));
      })
    );
  }

  /** Actualiza un producto y retorna el objeto actualizado */
  updateProduct(updated: Product): Observable<Product> {
    // En un caso real harías un PUT al backend.
    console.log('Vamos a actualizar: ', updated);
    return of(updated);
  }

}

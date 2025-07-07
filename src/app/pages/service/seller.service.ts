import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Seller } from '../../models/selller';
import { Comment } from '../../models/coment';
import { Product } from '../../models/product';
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

  getSeller(sellerid: string): Observable<Seller> {
    const mockFeaturedProducts: Product[] = [
      {
        id: '1',
        name: 'Artesanía de Madera',
        shortDescription: 'Figura tallada a mano en madera de cedro.',
        stars: 4.8,
        image: 'https://via.placeholder.com/200x200',
        price: 30000,
        originalPrice: 35000,
        sales: 45,
        seller: "1"
      },
      {
        id: '2',
        name: 'Pulsera Tejida',
        shortDescription: 'Pulsera hecha con hilo artesanal.',
        stars: 4.5,
        image: 'https://via.placeholder.com/200x200',
        price: 15000,
        originalPrice: null,
        sales: 78,
        seller: "1"
      }
    ];

    const mockProducts: Product[] = [
      {
        id: '3',
        name: 'Collar de Cuentas',
        shortDescription: 'Collar de cuentas de cerámica pintada a mano.',
        stars: 4.2,
        image: 'https://via.placeholder.com/200x200',
        price: 20000,
        originalPrice: 25000,
        sales: 52,
        seller: "1"
      },
      {
        id: '4',
        name: 'Portavasos en Madera',
        shortDescription: 'Set de 4 portavasos con diseño geométrico.',
        stars: 4.6,
        image: 'https://via.placeholder.com/200x200',
        price: 18000,
        originalPrice: null,
        sales: 30,
        seller: "1"
      },
      {
        id: '5',
        name: 'Broche de Tela',
        shortDescription: 'Broche decorativo de tela reciclada.',
        stars: 4.4,
        image: 'https://via.placeholder.com/200x200',
        price: 12000,
        originalPrice: null,
        sales: 25,
        seller: "1"
      }
    ];

    const mockComments: Comment[] = [
      {
        userName: 'Luis Fernández',
        rating: 5,
        comment: 'Muy buen producto, llegó en excelente estado y rápido.'
      },
      {
        userName: 'María Gómez',
        rating: 4,
        comment: 'Calidad agradable, solo un pequeño retraso en el envío.'
      }
    ];

    const mockSeller: Seller = {
      id: "1",
      profileImage: '', // vacío para probar avatar con inicial
      name: 'Juan Pérez',
      cellphone: '+573136090247',
      description: 'Artesanías hechas a mano en Medellín. Calidad y diseño único.',
      rating: 4.7,
      facebookUrl: 'https://facebook.com/juan.perez',
      instagramUrl: 'https://instagram.com/juan.perez',
      twitterUrl: 'https://twitter.com/juanperez',
      linkedinUrl: '',
      featuredProducts: mockFeaturedProducts,
      products: mockProducts,
      comments: mockComments
    };

    return of(mockSeller);
  }

  /** Actualiza el perfil del vendedor y retorna el objeto actualizado */
  updateSeller(updated: User): Observable<User> {
    // En un caso real harías un PUT al backend.
    return of(updated);
  }

  /** Simula subida de imagen y retorna la URL resultante */
  uploadProfileImage(file: File): Observable<string> {
    // En un caso real harías un POST a un endpoint de archivos.
    const mockUrl = 'https://via.placeholder.com/150';
    return of(mockUrl);
  }
}

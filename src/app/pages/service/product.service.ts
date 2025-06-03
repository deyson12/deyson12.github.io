import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly apiUrl = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) { }

  /** Obtiene todas las categorías */
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  /** Obtiene solo las categorías activas, ordenadas */
  getProductsByCategory(categoryCode: string): Observable<Product[]> {

    let url = '';
    if (categoryCode === 'all') {
      url = `${this.apiUrl}`;
    } else {
       url = `${this.apiUrl}/category/:categoryCode`.replace(':categoryCode', categoryCode);
    }
    return this.http.get<Product[]>(url);
  }

  private mockProducts: { [category: string]: Product[] } = {
    'food-and-drinks': [
      {
        id: 1, name: 'Pizza', image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/3b/2d/d1/forbici-pizza-with-burrata.jpg?w=600&h=-1&s=1', price: 25000, originalPrice: 30000, shortDescription: 'Jamon y queso', stars: 4.5, sales: 100,
        images: [
          'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/3b/2d/d1/forbici-pizza-with-burrata.jpg?w=600&h=-1&s=1'
        ],
        note: 'Deliciosa pizza ¡No te la pierdas!',
        sellerId: "1"
      },
      {
        id: 2, name: 'Soda', image: 'https://happywings.com.co/wp-content/uploads/2024/01/Soda-Sandia.jpg', price: 5000, originalPrice: null, shortDescription: '', stars: 4, sales: 100,
        sellerId: "2"
      }
    ],
    'fashion': [
      {
        id: 3, name: 'Camisa', image: 'https://renzo.com.co/wp-content/uploads/2023/07/230305085.jpg', price: 40000, originalPrice: 50000, shortDescription: '', stars: 4.3, sales: 100,
        sellerId: "1"
      },
      {
        id: 4, name: 'Jeans', image: 'https://industriastexmodasas.com/cdn/shop/products/2789.jpg?v=1669160143', price: 80000, originalPrice: 90000, shortDescription: '', stars: 4.7, sales: 100,
        sellerId: "3"
      }
    ],
    'electronics': [
      {
        id: 5, name: 'Audífonos Bluetooth', image: 'https://iostoreshop.com/cdn/shop/files/10_png.webp?v=1693670514', price: 120000, originalPrice: 150000, shortDescription: '', stars: 4.6, sales: 100,
        sellerId: "1"
      },
      {
        id: 6, name: 'Smartphone', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRSq0KEZWVQH07g2o79ioA7TMpT-TJs7yJSg&s', price: 800000, originalPrice: 900000, shortDescription: '', stars: 4.8, sales: 100,
        sellerId: "4"
      }
    ],
    'home': [
      {
        id: 7, name: 'Lámpara de mesa', image: 'https://blueart.com.co/cdn/shop/files/WhatsAppImage2023-09-30at12.01.37PM.jpg?v=1696094427', price: 60000, originalPrice: 70000, shortDescription: '', stars: 4.2, sales: 100,
        sellerId: "1"
      }
    ],
    'health-and-beauty': [
      {
        id: 8, name: 'Crema facial', image: 'https://olimpica.vtexassets.com/arquivos/ids/1299671/42277071_1.jpg?v=638428274890500000', price: 30000, originalPrice: 40000, shortDescription: '', stars: 4.4, sales: 100,
        sellerId: "1"
      }
    ],
    'sports-and-outdoors': [
      {
        id: 9, name: 'Balón de fútbol', image: 'https://sps-sport.com/img/cms/Blog/diferencias%20entre%20los%20balones%20de%20futbol%20sala%20y%20los%20de%20futbol%2011.jpg', price: 45000, originalPrice: 55000, shortDescription: '', stars: 4.5, sales: 100,
        sellerId: "1"
      }
    ],
    'automotive': [
      {
        id: 10, name: 'Aceite para motor', image: 'https://autopla1.b-cdn.net/wp-content/uploads/2020/09/MOBIL-SPECIAL_25W-50-Photoroom.jpg', price: 35000, originalPrice: 42000, shortDescription: '', stars: 4.1, sales: 100,
        sellerId: "1"
      }
    ],
    'toys-and-entertainment': [
      {
        id: 11, name: 'Rompecabezas 500 piezas', image: 'https://www.ingeniodestrezamental.com/cdn/shop/files/rompecabezas-500-piezas-casa-encantada-linea-premium-2.jpg?v=1732577954', price: 28000, originalPrice: 35000, shortDescription: '', stars: 4.6, sales: 100,
        sellerId: "1"
      }
    ],
    'pets': [
      {
        id: 12, name: 'Croquetas para perro', image: 'https://www.merkadomi.com/wp-content/uploads/2020/10/IMG20220330191359-removebg-preview.png', price: 35000, originalPrice: 40000, shortDescription: '', stars: 4.3, sales: 100,
        sellerId: "1"
      }
    ],
    'services': [
      {
        id: 13, name: 'Curso online de cocina', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_9gr2VZ3-Vx8ebXuh6NCLYnZ9EQAIF4zmlQ&s', price: 100000, originalPrice: 120000, shortDescription: '', stars: 4.9, sales: 100,
        sellerId: "1"
      },
      {
        id: 14, image: 'https://www.infobae.com/resizer/v2/6N2REW3NAJD6HEVEB6R6QHAM7Q.png?auth=c8e1873a9f3dc0139e79594139cba8788b68465ea02eefde1fc695ddfae5193f&smart=true&width=992&height=661&quality=85', name: 'Arepa Arriera + Chicharrón', price: 50000, originalPrice: 100000, shortDescription: '', stars: 4.5, sales: 100,
        sellerId: "1"
      },
      {
        id: 15, image: 'https://www.recetasnestle.com.ec/sites/default/files/srh_recipes/4e4293857c03d819e4ae51de1e86d66a.jpg', name: 'ANTIOQUEÑO GRANDE + Salchichón', price: 40000, originalPrice: 1000000, shortDescription: '', stars: 4.2, sales: 100,
        sellerId: "1"
      },
      {
        id: 16, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5NE-_2_AphZSBppU5Xa8AY1WtHmbERd1SlA&s', name: 'Bacon Honey', price: 19200, originalPrice: 38400, shortDescription: 'picante', stars: 4.6, sales: 100,
        sellerId: "1"
      }
    ]
  };

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

  getProductsBySeller(): Observable<Product[]> {
    const mockProducts: Product[] = [
      {
        id: 1,
        image: 'https://www.infobae.com/resizer/v2/6N2REW3NAJD6HEVEB6R6QHAM7Q.png?auth=c8e1873a9f3dc0139e79594139cba8788b68465ea02eefde1fc695ddfae5193f&smart=true&width=992&height=661&quality=85',
        name: 'Tamal de Pollo',
        shortDescription: 'ligeramente picante',
        stars: 4.5,
        sales: 100,
        price: 50000,
        originalPrice: 100000,
        note: 'picante',
        featured: true,
        sellerId: "1"
      },
      {
        id: 2,
        image: 'https://www.recetasnestle.com.ec/sites/default/files/srh_recipes/4e4293857c03d819e4ae51de1e86d66a.jpg',
        name: 'Hamburguesa de Carne de Res',
        shortDescription: '',
        stars: 3.5,
        sales: 8,
        price: 40000,
        originalPrice: 1000000,
        sellerId: "1"
      },
      {
        id: 3,
        image: 'https://www.infobae.com/resizer/v2/6N2REW3NAJD6HEVEB6R6QHAM7Q.png?auth=c8e1873a9f3dc0139e79594139cba8788b68465ea02eefde1fc695ddfae5193f&smart=true&width=992&height=661&quality=85',
        name: 'Bacon Honey',
        shortDescription: '',
        stars: 2.5,
        sales: 1050,
        price: 19200,
        originalPrice: 38400,
        sellerId: "1"
      }
    ];
    return of(mockProducts);
  }

  /** Elimina un producto por su ID */
  deleteProduct(id: number): Observable<void> {
    // En un caso real harías un DELETE al backend.
    return of(undefined);
  }

  /** Actualiza un producto y retorna el objeto actualizado */
  updateProduct(updated: Product): Observable<Product> {
    // En un caso real harías un PUT al backend.
    return of(updated);
  }

}

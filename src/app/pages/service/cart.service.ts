// cart.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { MessageService } from 'primeng/api';
import { Order } from '../../models/order';
import { ProductCart } from '../../models/product-cart';
import { Product } from '../../models/product';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ConfirmOrderResponse } from '../../models/confirmOrderResponse';
import { CoverageZonesService } from './coverage-zones.service';

@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly apiUrl = `${environment.apiUrl}/api/orders`;

  private readonly storageKey = 'orders';

  // 1) Señal interna con el arreglo de órdenes
  private readonly ordersSignal = signal<Order[]>([]);

  // 2) Exponer un "computed" para leer el arreglo desde componentes
  readonly orders = computed(() => this.ordersSignal());
  // (opcional) un contador de órdenes
  readonly orderCount = computed(() => this.ordersSignal().length);

  constructor(
    private readonly messageService: MessageService,
    private readonly http: HttpClient,
    private readonly coverageZonesService: CoverageZonesService
  ) {
    this.loadOrders();
  }

  getCount(orders: Order[]) {
    return orders
      .reduce((sum, order) =>
        sum + order.products.reduce((c, p) => c + p.quantity, 0)
        , 0)
  }

  // Carga inicial desde localStorage
  private loadOrders(): void {
    const data = localStorage.getItem(this.storageKey);
    this.ordersSignal.set(data ? JSON.parse(data) : []);
  }

  // Guarda siempre el estado actual de la señal en localStorage
  private saveOrders(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.ordersSignal()));
  }

  // Helper para aplicar un cambio en el arreglo y luego salvar
  private updateOrders(updateFn: (orders: Order[]) => Order[]) {
    this.ordersSignal.update(updateFn);
    this.saveOrders();
  }

  addProductToCart(product: Product, selectedOptions: { [key: string]: any }): void {
    const pending = this.ordersSignal().find(o => o.sellerId === product.seller && o.status === 'PENDIENTE');

    const cartItem: ProductCart = { product, quantity: 1, selectedOptions };

    if (pending) {
      this.addProduct(pending.id, cartItem);
    } else {

      const newOrder: Omit<Order, 'id' | 'products'> = {
        sellerId: product.seller,
        buyerId: '',
        status: 'PENDIENTE',
        address: '',
        paymentType: 'EFECTIVO',
        changeFrom: 0,
        location: [0, 0],
        deliveryPrice: 0
      };
      const created = this.create(newOrder);
      this.addProduct(created.id, cartItem);
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Producto agregado',
      detail: product.name,
      life: 3000
    });
  }

  getAll(): Order[] {
    return [...this.ordersSignal()];
  }

  getById(orderId: string): Order | undefined {
    return this.ordersSignal().find(o => o.id === orderId);
  }

  create(data: Omit<Order, 'id' | 'products'> & { products?: ProductCart[] }): Order {
    const id = uuidv4();
    const lat = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').latitude : 0;
    const lng = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').longitude : 0;

    const location: [number, number] = [lat, lng];

    const order: Order = {
      id: id,
      sellerId: data.sellerId,
      buyerId: data.buyerId,
      products: data.products ?? [],
      status: data.status,
      address: data.address,
      paymentType: data.paymentType,
      changeFrom: data.changeFrom,
      location: location,
      deliveryPrice: data.deliveryPrice,
    };
    this.updateOrders(list => [...list, order]);
    return order;
  }

  addProduct(orderId: string, product: ProductCart): void {
    this.updateOrders(list =>
      list.map(o => {
        if (o.id === orderId) {
          const exist = o.products.find(p => p.product.id === product.product.id);
          if (exist) {
            exist.quantity++;
          } else {
            o.products = [...o.products, { ...product, quantity: 1, selectedOptions: product.selectedOptions || {} }];
          }
        }
        return o;
      })
    );
  }

  updateProductQty(orderId: string, productId: string, qty: number): void {
    this.updateOrders(list =>
      list.map(o => {
        if (o.id === orderId) {
          o.products = o.products
            .map(p => p.product.id === productId ? { ...p, quantity: qty } : p)
            .filter(p => p.quantity > 0);
        }
        return o;
      })
    );
  }

  deleteOrder(orderId: string): void {
    this.updateOrders(list => list.filter(o => o.id !== orderId));
  }

  getTotal(orderId: string): number {
    const ord = this.getById(orderId);
    return ord
      ? ord.products.reduce((sum, p) => sum + p.product.price * p.quantity, 0)
      : 0;
  }

  sendOrder(order: Order): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => new Error('Ocurrió un error creando la orden'));
  }
}

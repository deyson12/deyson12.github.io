// cart.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { MessageService } from 'primeng/api';
import { Order } from '../../models/order';
import { ProductCart } from '../../models/product-cart';
import { Product } from '../../models/product';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'orders';

  // 1) Señal interna con el arreglo de órdenes
  private readonly ordersSignal = signal<Order[]>([]);

  // 2) Exponer un "computed" para leer el arreglo desde componentes
  readonly orders = computed(() => this.ordersSignal());
  // (opcional) un contador de órdenes
  readonly orderCount = computed(() => this.ordersSignal().length);

  constructor(private readonly messageService: MessageService) {
    this.loadOrders();
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

  addProductToCart(product: Product): void {
    const pending = this.ordersSignal().find(o => o.sellerId === product.seller && o.status === 'Pendiente');

    const cartItem: ProductCart = { id: 1, product, quantity: 1 };

    if (pending) {
      this.addProduct(pending.order, cartItem);
    } else {
      const newOrder: Omit<Order, 'order' | 'products'> = {
        sellerId: product.seller,
        buyer: { name: 'Cliente Anónimo', cellphone: '123' },
        status: 'Pendiente',
        address: 'Dirección del cliente',
        paymentType: 'Efectivo',
        changeFrom: 0
      };
      const created = this.create(newOrder);
      this.addProduct(created.order, cartItem);
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
    return this.ordersSignal().find(o => o.order === orderId);
  }

  create(data: Omit<Order, 'order' | 'products'> & { products?: ProductCart[] }): Order {
    const id = uuidv4();
    const order: Order = {
      order: id,
      sellerId: data.sellerId,
      buyer: data.buyer,
      products: data.products ?? [],
      status: data.status,
      address: data.address,
      paymentType: data.paymentType,
      changeFrom: data.changeFrom
    };
    this.updateOrders(list => [...list, order]);
    return order;
  }

  addProduct(orderId: string, product: ProductCart): void {
    this.updateOrders(list =>
      list.map(o => {
        if (o.order === orderId) {
          const exist = o.products.find(p => p.product.id === product.product.id);
          if (exist) {
            exist.quantity++;
          } else {
            o.products = [...o.products, { ...product, quantity: 1 }];
          }
        }
        return o;
      })
    );
  }

  updateProductQty(orderId: string, productId: string, qty: number): void {
    this.updateOrders(list =>
      list.map(o => {
        if (o.order === orderId) {
          o.products = o.products
            .map(p => p.product.id === productId ? { ...p, quantity: qty } : p)
            .filter(p => p.quantity > 0);
        }
        return o;
      })
    );
  }

  deleteOrder(orderId: string): void {
    this.updateOrders(list => list.filter(o => o.order !== orderId));
  }

  getTotal(orderId: string): number {
    const ord = this.getById(orderId);
    return ord
      ? ord.products.reduce((sum, p) => sum + p.product.price * p.quantity, 0)
      : 0;
  }
}

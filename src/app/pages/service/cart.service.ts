// cart.service.ts
import { v4 as uuidv4 } from 'uuid';

import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Order } from '../../models/order';
import { ProductCart } from '../../models/product-cart';
import { Product } from '../../models/product';

@Injectable({
  providedIn: 'root',
})
export class CartService {

  private storageKey = 'orders';
  private orders: Order[] = [];

  constructor(private messageService: MessageService) {
    this.loadOrders();
  }

  addProductToCart(product: Product): void {

    // Añadir producto al carrito 
    const existingOrder = this.orders.find(o => o.sellerId === product.seller && o.status === 'Pendiente');
    if (existingOrder) {
      // addProduct(orderId: number, product: Omit<ProductCart,'quantity'>)
      
      // Producto de ejemplo
      const productCart: ProductCart = {
        id: 1,
        product: product,
        quantity: 1
      };

      // Llamada al método
      this.addProduct(existingOrder.order, productCart);
    } else {
      const newOrder: Omit<Order, 'order' | 'products'> = {
        sellerId: product.seller,
        buyer: {
          name: 'Cliente Anónimo', // Aquí podrías usar un servicio de usuario para obtener el nombre del cliente
          cellphone: '123'
        },
        status: 'Pendiente',
        address: 'Dirección del cliente', // Aquí podrías usar un servicio de usuario para obtener la dirección
        paymentType: 'Efectivo', // Aquí podrías usar un servicio de usuario para obtener el tipo de pago
        changeFrom: 0 // Aquí podrías usar un servicio de usuario para obtener el cambio
      };
      const createdOrder = this.create(newOrder);

      const productCart: ProductCart = {
        id: 1,
        product: product,
        quantity: 1
      };

      this.addProduct(createdOrder.order, productCart);
    }

    this.messageService.add({
        severity: 'success',           // 'success' | 'info' | 'warn' | 'error'
        summary: 'Product agregado',            // título breve
        detail: `${product.name}`,  // mensaje detallado
        life: 3000                     // opcional: duración en ms
      });
  }

  private loadOrders(): void {
    const data = localStorage.getItem(this.storageKey);
    this.orders = data ? JSON.parse(data) : [];
  }

  private saveOrders(): void {
    console.log('Guardando órdenes en localStorage', this.orders);
    localStorage.setItem(this.storageKey, JSON.stringify(this.orders));
  }

  /** Devuelve todas las órdenes */
  getAll(): Order[] {
    return [...this.orders];
  }

  /** Crea una nueva orden y la devuelve */
  create(orderData: Omit<Order, 'order' | 'products'> & { products?: ProductCart[] }): Order {
    const nextId = uuidv4();
    const newOrder: Order = {
      order: nextId,
      sellerId: orderData.sellerId,
      buyer: orderData.buyer,
      products: orderData.products ?? [],
      status: orderData.status,
      address: orderData.address,
      paymentType: orderData.paymentType,
      changeFrom: orderData.changeFrom
    };
    this.orders.push(newOrder);
    this.saveOrders();
    return newOrder;
  }

  /** Obtiene una orden por su número */
  getById(orderId: string): Order | undefined {
    return this.orders.find(o => o.order === orderId);
  }

  /** Añade o incrementa un producto en una orden */
  addProduct(orderId: string, product: ProductCart): void {
    const ord = this.getById(orderId);
    if (!ord) return;
    const existing = ord.products.find(p => p.product.id === product.product.id);
    if (existing) {
      existing.quantity++;
    } else {
      ord.products.push({ ...product, quantity: 1 });
    }
    this.saveOrders();
  }

  /** Actualiza cantidad de un producto (0 elimina) */
  updateProductQty(orderId: string, productId: number, qty: number): void {
    console.log('updateProductQty: Orden:', orderId, ' - Producto:', productId, ' - Cantidad:', qty);
    const ord = this.getById(orderId);
    console.log('Orden encontrada:', ord);
    if (!ord) return;
    const idx = ord.products.findIndex(p => p.product.id === productId);
    console.log('Índice del producto:', idx);
    if (idx < 0) return;
    if (qty <= 0) {
      console.log('Eliminando producto de la orden');
      console.log('Producto a eliminar:', ord.products[idx]);
      ord.products.splice(idx, 1);
    } else {
      ord.products[idx].quantity = qty;
    }
    console.log('Productos actualizados:', ord.products);
    this.saveOrders();
  }

  /** Elimina una orden completa */
  deleteOrder(orderId: string): void {
    this.orders = this.orders.filter(o => o.order !== orderId);
    this.saveOrders();
  }

  /** Total de una orden */
  getTotal(orderId: string): number {
    const ord = this.getById(orderId);
    return ord
      ? ord.products.reduce((sum, p) => sum + p.product.price * p.quantity, 0)
      : 0;
  }
}
import { Component } from '@angular/core';
import { Order } from '../../../models/order';
import { CartTabComponent } from './cart-tab/cart-tab.component';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-cart',
  imports: [TabsModule, CartTabComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent {

  constructor() {
    // ger orders from local storage
    const ordersFromStorage = localStorage.getItem('orders');
    if (ordersFromStorage) {
      this.orders = JSON.parse(ordersFromStorage);
    }
  }

  ordersOld: Order[] = [];

  orders: Order[] = [];

}

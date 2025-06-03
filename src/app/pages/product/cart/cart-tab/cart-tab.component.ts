import { Component, Input } from '@angular/core';
import { CartCardComponent } from '../cart-card/cart-card.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Order } from '../../../../models/order';

@Component({
  selector: 'app-cart-tab',
  imports: [CartCardComponent, CommonModule, RouterModule],
  templateUrl: './cart-tab.component.html',
  styleUrl: './cart-tab.component.scss'
})
export class CartTabComponent {

  
  @Input() orders: Order[] = []; // Assuming orders is an array of objects

  // return true if there is ay order with products
  anyOrderWithProducts(): boolean {
  return Array.isArray(this.orders)
      && this.orders.some(order => Array.isArray(order.products) && order.products.length > 0);
  }


}

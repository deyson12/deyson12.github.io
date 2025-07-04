import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Product } from '../../../models/product';
import { ProductService } from '../../service/product.service';
import { RouterModule } from '@angular/router';
import { CartService } from '../../service/cart.service';

@Component({
  selector: 'app-card',
  imports: [CommonModule, RouterModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {

  constructor(
    private readonly productService: ProductService, 
    private readonly cartService: CartService
  ) { }

  @Input() product: Product | null = null;
  @Input() puedeNavegar = true;

  getSalesDetail(sales: number|undefined): string {
    return this.productService.getSalesDetail(sales);
  }

  getDiscount(product: Product): string {
    return this.productService.getDiscount(product);
  }

  addProductToCart(product: Product) {
    if(!this.puedeNavegar)
      return;
    this.cartService.addProductToCart(product);
  }

}

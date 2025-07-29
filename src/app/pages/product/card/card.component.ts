import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Product } from '../../../models/product';
import { ProductService } from '../../service/product.service';
import { RouterModule } from '@angular/router';
import { CartService } from '../../service/cart.service';
import { SkeletonModule } from 'primeng/skeleton';
import { OptimizeCloudinaryPipe } from '../../../pipes/optimize-cloudinary.pipe';
import { CloudinarySrcsetPipe } from '../../../pipes/cloudinary-srcset.pipe';
import { CloudinaryPlaceholderPipe } from '../../../pipes/cloudinary-placeholder.pipe';

@Component({
  selector: 'app-card',
  imports: [CommonModule, RouterModule, SkeletonModule, 
    OptimizeCloudinaryPipe, CloudinarySrcsetPipe, CloudinaryPlaceholderPipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {

  loaded = false;

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

  /*addProductToCart(product: Product) {
    if(!this.puedeNavegar)
      return;
    this.cartService.addProductToCart(product);
  }*/

}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { Product } from '../../../models/product';
import { ButtonProps } from 'primeng/button';
import { ProductService } from '../../service/product.service';
import { RouterModule } from '@angular/router';
import { CartService } from '../../service/cart.service';

@Component({
  selector: 'app-carousel',
  imports: [CarouselModule, CommonModule, RouterModule],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss'
})
export class CarouselComponent {

  constructor(private productService: ProductService,
              private cartService: CartService
  ) { }

    responsiveOptions = [
      {
        breakpoint: '1024px',
        numVisible: 2,
        numScroll: 1
      },
      {
        breakpoint: '640px',
        numVisible: 1,
        numScroll: 1
      }
    ];

  @Input() itemsCarousel: Product[] = [];
  @Input() title: string = 'Productos destacados hasta por';

  arrowButton: ButtonProps = {styleClass: 'bg-orange-500 hover:bg-orange-600 text-white border-none rounded-full p-3 shadow-md'};

  getDiscount(product: Product): string {
    return this.productService.getDiscount(product);
  }

  getLessProductPrice(items: Product[]): number {
    return items.reduce((min, item) => Math.min(min, item.price), items[0].price);
  }

  getSalesDetail(sales: any) {
    return this.productService.getSalesDetail(sales);
  }

  addProductToCart(product: Product) {
    this.cartService.addProductToCart(product);
  }
}

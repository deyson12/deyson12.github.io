import { Component, Input, OnInit } from '@angular/core';
import { Product } from '../../../models/product';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../../service/product.service';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent {

  product!: Product;

  /** Imagen principal que se mostrará */
  mainImage!: string;

  /** Color seleccionado (si lo usas) */
  selectedColor: string = '';

  constructor(private router: Router, private productService: ProductService) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras.state && nav.extras.state['product']) {
      this.product = nav.extras.state['product'] as Product;
      this.mainImage = this.product.image;
    }
  }

  relatedProducts: Product[] = [
    {
      id: 2,
      name: 'Uñas',
      shortDescription: 'Uñas Acrilicas',
      price: 30000,
      image: 'https://industriastexmodasas.com/cdn/shop/products/2789.jpg?v=1669160143',
      stars: 4.5,
      originalPrice: 50000,
      sales: 5,
      seller: "1"
    },
    {
      id: 3,
      name: 'Tramites Visa',
      shortDescription: 'Tramites de Visa para Estados Unidos',
      price: 25000,
      image: 'https://happywings.com.co/wp-content/uploads/2024/01/Soda-Sandia.jpg',
      stars: 4.5,
      originalPrice: 50000,
      sales: 5,
      seller: "1"
    }
  ]

  getSalesDetail(sales: number | undefined): string {
    console.log('Sales detail:', sales);
    return this.productService.getSalesDetail(sales);
  }

}

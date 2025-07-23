import { Component, OnInit } from '@angular/core';
import { Product } from '../../../models/product';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../service/product.service';
import { User } from '../../../models/user';
import { UserService } from '../../service/user.service';
import { GalleriaModule } from 'primeng/galleria';
import { DialogModule } from 'primeng/dialog';
import { FixedCartComponent } from "../fixed-cart/fixed-cart.component";
import { CartService } from '../../service/cart.service';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, GalleriaModule, DialogModule, FixedCartComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit {

  product!: Product;

  /** Color seleccionado (si lo usas) */
  selectedColor: string = '';

  user: User | null = null;

  displayZoom = false;
  zoomImage: string | null = null;

  mainImage: string | null = null;

  galleriaResponsiveOptions: any[] = [
    {
      breakpoint: '1024px',
      numVisible: 5
    },
    {
      breakpoint: '960px',
      numVisible: 4
    },
    {
      breakpoint: '768px',
      numVisible: 3
    },
    {
      breakpoint: '560px',
      numVisible: 1
    }
  ];

  productId: string = '';

  constructor(
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly userService: UserService,
    private readonly route: ActivatedRoute,
    private readonly cartService: CartService
  ) {
    const nav = this.router.getCurrentNavigation();
    this.product = nav?.extras?.state?.['product'] as Product;
    this.productId = this.route.snapshot.paramMap.get('uuid') ?? '';
  }

  relatedProducts: Product[] = []

  zoomStyles: { [k: string]: any } = {};
  zoomFactor = 2.5;

  onZoomMove(e: MouseEvent, container: HTMLElement) {
    const img = container.querySelector('img') as HTMLImageElement;
    const { left, top, width, height } = container.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    if (!img) return;

    // Calcular posición del fondo
    const bgX = -((x / width) * (img.naturalWidth * this.zoomFactor - width));
    const bgY = -((y / height) * (img.naturalHeight * this.zoomFactor - height));

    this.zoomStyles = {
      width: `${img.naturalWidth * this.zoomFactor}px`,
      height: `${img.naturalHeight * this.zoomFactor}px`,
      transform: `translate(${bgX}px, ${bgY}px)`
    };
  }

  onZoomLeave(container: HTMLElement) {
    this.zoomStyles = {};
  }

  ngOnInit(): void {

    this.route.params.subscribe(params => {
      // lee el product que enviaste en state
      this.product = history.state.product as Product;
    });

    if (!this.product) {
      this.productService.getProductById(this.productId).subscribe({
        next: (response: Product) => {
          this.product = response;
          this.userService.getUserById(this.product.seller).subscribe({
            next: (response: User) => {
              this.user = response;
            }
          });
        },
        error: (error) => {
          console.error('Error fetching product:', error);
          // Aquí podrías redirigir a una página de error o mostrar un mensaje
          //this.router.navigate(['/pages/product']);
        }
      });
    } else {
      this.userService.getUserById(this.product.seller).subscribe({
        next: (response: User) => {
          this.user = response;
        }
      });
    }

  }

  openZoom(img: string) {
    console.log('Opening zoom for image:', img);
    this.zoomImage = img;
    this.displayZoom = true;
  }

  getSalesDetail(sales: number | undefined): string {
    return this.productService.getSalesDetail(sales);
  }

  addProductToCart(product: Product) {
    this.cartService.addProductToCart(product);
  }

  buyProduct(product: Product) {
    this.addProductToCart(product);
    this.router.navigate(['/pages/cart']);
  }
}

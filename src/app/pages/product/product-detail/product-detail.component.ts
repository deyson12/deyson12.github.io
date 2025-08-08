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
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-product-detail',
  imports: [
    CommonModule,
    FormsModule,
    GalleriaModule,
    DialogModule,
    FixedCartComponent,
    TextareaModule
  ],
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

  role: string = '';

  constructor(
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly userService: UserService,
    private readonly route: ActivatedRoute,
    private readonly cartService: CartService,
    private readonly authService: AuthService
  ) {
    const nav = this.router.getCurrentNavigation();
    this.product = nav?.extras?.state?.['product'] as Product;
    this.productId = this.route.snapshot.paramMap.get('uuid') ?? '';
    this.role = this.authService.getValueFromToken('role');
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
          this.loadUser();
        },
        error: (error) => {
          console.error('Error fetching product:', error);
          // Aquí podrías redirigir a una página de error o mostrar un mensaje
          //this.router.navigate(['/pages/product']);
        }
      });
    } else {
      this.loadUser();
    }

  }

  loadUser() {
    this.userService.getUserById(this.product.seller).subscribe({
      next: (response: User) => {
        this.user = response;
      }
    });
  }

  selectedOptions: { [key: string]: any } = {};
  errors: { [key: string]: string } = {};

  // Método que valida todas las opciones requeridas
  validateOptions(): boolean {
    this.errors = {};
    let valid = true;

    if (!this.product.customOptions || this.product.customOptions.length === 0) {
      return true; // No hay opciones personalizadas, no hay validación necesaria
    }

    this.product.customOptions.forEach(opt => {
      const key = opt['name'];
      const val = this.selectedOptions[key];

      if (opt['required']) {
        switch (opt['type']) {
          case 'multiselect':
            if (!Array.isArray(val) || val.length === 0) {
              this.errors[key] = 'Seleccione al menos una opción';
              valid = false;
            }
            break;
          default:
            if (val === null || val === undefined || val === '') {
              this.errors[key] = 'Este campo es obligatorio';
              valid = false;
            }
        }
      }
    });

    return valid;
  }

  // Para multiselect
  onMultiSelectChange(name: string, value: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (!Array.isArray(this.selectedOptions[name])) {
      this.selectedOptions[name] = [];
    }
    const arr = this.selectedOptions[name] as string[];
    if (checked) arr.push(value);
    else {
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
    }
  }
  isMultiSelected(name: string, value: string): boolean {
    return Array.isArray(this.selectedOptions[name]) && this.selectedOptions[name].includes(value);
  }
  hasAnyMultiSelected(name: string): boolean {
    return Array.isArray(this.selectedOptions[name]) && this.selectedOptions[name].length > 0;
  }

  // Para file
  onFileChange(ev: Event, name: string) {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedOptions[name] = input.files[0];
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

    if (!this.validateOptions()) {
      console.error('Validation failed:', this.errors);
      return;
    }

    this.cartService.addProductToCart(product, this.selectedOptions);
  }

  buyProduct(product: Product) {

    if (!this.validateOptions()) {
      console.error('Validation failed:', this.errors);
      return;
    }

    this.addProductToCart(product);
    this.router.navigate(['/pages/cart']);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { Product } from '../../../models/product';
import { Item } from '../../../models/item';
import { CarouselComponent } from '../carousel/carousel.component';
import { BannerComponent } from "../banner/banner.component";
import { Banner } from '../../../models/banner';
import { CardComponent } from '../card/card.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductService } from '../../service/product.service';
import { CartService } from '../../service/cart.service';
import { AuthService } from '../../service/auth.service';
import { BannerService } from '../../service/banner.service';
import { FixedCartComponent } from '../fixed-cart/fixed-cart.component';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    CarouselComponent,
    BannerComponent,
    CardComponent,
    RouterModule,
    FixedCartComponent
  ],
  providers: [CartService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  products: Product[] = [];
  banners: Banner[] = [];
  itemsCarousel: Product[] = [];

  showBannerGlobal = true;
  showBanner = false;

  currentPath: string = '';

  plan: string = '';
  days: number;

  interval = 3;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly bannerService: BannerService
  ) {
    this.plan = this.authService.getValueFromToken('plan');
    this.days = this.getDaysRemaining();
  }

  ngOnInit() {
    this.route.url.subscribe(urlSegments => {
      this.currentPath = urlSegments.map(segment => segment.path).join('/');
    });

    this.bannerService.getBannersByCategory(this.currentPath).subscribe((data: Banner[]) => {
      this.banners = data;
      this.productService.getProductsByCategory(this.currentPath).subscribe((data: Product[]) => {
        this.products = data;
        this.interval = Math.floor(this.products.length / this.banners.length);
      });
    });

    this.productService.getFeaturedProductsByCategory(this.currentPath).subscribe((data: Product[]) => {
      this.itemsCarousel = data;
    });

    this.showBanner = this.authService.getValueFromToken('role') != 'seller';

  }

  getDaysRemaining(): number {
    const endDateStr = this.authService.getValueFromToken('endDate');
    if (!endDateStr) {
      return 0;
    }
    const [year, month, day] = endDateStr.split('-').map(Number);
    const end = new Date(year, month - 1, day);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = end.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getBannerForIndex(i: number): Banner {
    const idx = Math.floor((i + 1) / this.interval) - 1;
    return this.banners[idx % this.banners.length];
  }

  showBannerProductos(i: number): boolean {
    const banner = this.getBannerForIndex(i);

    if (banner.endTimerDate) {
      const target = new Date(banner?.endTimerDate).getTime();
      // Si la fecha es inválida, pasada o igual al momento actual, ocultamos todo el banner
      if (isNaN(target) || target <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  itemsMenu: Item[] = [
    { id: 1, icon: 'assets/img/pollo.png', label: 'Pollo' },
    { id: 1, icon: 'assets/img/hamburguesa.png', label: 'Hamburguesa' },
    { id: 1, icon: 'assets/img/pizza.png', label: 'Pizza' },
    { id: 1, icon: 'assets/img/helado.png', label: 'Helado' },
    { id: 1, icon: 'assets/img/manicure.png', label: 'Manicure' }
  ];

}

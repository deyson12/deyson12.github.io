import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { Product } from '../../../models/product';
import { Item } from '../../../models/item';
import { SliderComponent } from "../slider/slider.component";
import { CarouselComponent } from '../carousel/carousel.component';
import { BannerComponent } from "../banner/banner.component";
import { Banner } from '../../../models/banner';
import { CardComponent } from '../card/card.component';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../service/product.service';
import { CartService } from '../../service/cart.service';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    SliderComponent,
    CarouselComponent,
    BannerComponent,
    CardComponent
  ],
  providers: [CartService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {

  products: Product[] = [];
  
  showBanner = true;

  currentPath: string = '';

  constructor(private route: ActivatedRoute, private productService: ProductService) { }

  ngOnInit() {
    this.route.url.subscribe(urlSegments => {
      this.currentPath = urlSegments.map(segment => segment.path).join('/');
    });

    this.productService.getProductsByCategory(this.currentPath).subscribe((data: Product[]) => {
      this.products = data;
    });
  }

  itemsCarousel: Product[] = [
    {
      id: 1,
      image: 'https://www.infobae.com/resizer/v2/6N2REW3NAJD6HEVEB6R6QHAM7Q.png?auth=c8e1873a9f3dc0139e79594139cba8788b68465ea02eefde1fc695ddfae5193f&smart=true&width=992&height=661&quality=85',
      name: 'Tamal de Pollo',
      shortDescription: 'ligeramente picante',
      stars: 4.5,
      sales: 100,
      price: 50000,
      originalPrice: 100000,
      note: 'picante',
      sellerId: "1"
    },
    {
      id: 2,
      image: 'https://www.recetasnestle.com.ec/sites/default/files/srh_recipes/4e4293857c03d819e4ae51de1e86d66a.jpg',
      name: 'Hamburguesa de Carne de Res',
      shortDescription: '',
      stars: 3.5,
      sales: 8,
      price: 40000,
      originalPrice: 1000000,
      sellerId: "1"
    },
    {
      id: 3,
      image: 'https://www.infobae.com/resizer/v2/6N2REW3NAJD6HEVEB6R6QHAM7Q.png?auth=c8e1873a9f3dc0139e79594139cba8788b68465ea02eefde1fc695ddfae5193f&smart=true&width=992&height=661&quality=85',
      name: 'Bacon Honey',
      shortDescription: '',
      stars: 2.5,
      sales: 1050,
      price: 19200,
      originalPrice: 38400,
      sellerId: "1"
    },
    {
      id: 3,
      image: 'https://www.infobae.com/resizer/v2/6N2REW3NAJD6HEVEB6R6QHAM7Q.png?auth=c8e1873a9f3dc0139e79594139cba8788b68465ea02eefde1fc695ddfae5193f&smart=true&width=992&height=661&quality=85',
      name: 'Bacon Honey',
      shortDescription: '',
      stars: 4.5,
      sales: 100,
      price: 19200,
      originalPrice: 38400,
      sellerId: "1"
    }
  ];

  banner: Banner = {
    id: 1,
    subText: 'Pidela por tiempo limitado',
    endDate: '2025-05-21T17:14:00',
    product: this.itemsCarousel[0],
  };

  banner2: Banner = {
    id: 1,
    subText: 'Pidela Ahora!',
    type: 'mothers-day',
    endDate: '2025-05-21T17:14:00',
    product: this.itemsCarousel[1],
  };

  banner3: Banner = {
    id: 1,
    subText: 'Pidela Ahora!',
    endDate: '2026-05-21T17:14:00',
    product: this.itemsCarousel[2],
  };

  itemsMenu: Item[] = [
    { id: 1, icon: 'assets/img/pollo.png', label: 'Pollo' },
    { id: 1, icon: 'assets/img/hamburguesa.png', label: 'Hamburguesa' },
    { id: 1, icon: 'assets/img/pizza.png', label: 'Pizza' },
    { id: 1, icon: 'assets/img/helado.png', label: 'Helado' },
    { id: 1, icon: 'assets/img/manicure.png', label: 'Manicure' }
  ];


}

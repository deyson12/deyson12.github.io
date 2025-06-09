import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Seller } from '../../../models/selller';
import { CardComponent } from '../card/card.component';
import { CartService } from '../../service/cart.service';
import { CarouselComponent } from '../carousel/carousel.component';

@Component({
  selector: 'app-seller-profile',
  imports: [CommonModule, CardComponent, CarouselComponent],
  providers: [CartService],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss'
})
export class SellerProfileComponent {

  seller: Seller = {
    id: '1',
    profileImage: '',
    name: 'Tiendita de Legos - Juan Pérez',
    cellphone: '+573136090247',
    description: 'Bienvenido a la Tiendita de Legos, donde encontrarás una amplia variedad de sets de construcción y accesorios para todos los amantes de los bloques. Desde sets clásicos hasta las últimas novedades, tenemos algo para cada fanático de Lego.',
    rating: 4.8,
    facebookUrl: 'https://facebook.com/juanperezartesano',
    instagramUrl: 'https://instagram.com/juanperezartesano',
    twitterUrl: 'https://twitter.com/juanperezartesano',
    linkedinUrl: 'https://linkedin.com/in/juanperezartesano',
    featuredProducts: [
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
        seller: "1"
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
        seller: "1"
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
        seller: "1"
      }
    ],
    products: [
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
        seller: "1"
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
        seller: "1"
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
        seller: "1"
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
        seller: "1"
      }
    ],
    comments: [
      {
        userName: 'Carlos López',
        rating: 5,
        comment: 'Excelente calidad y atención. ¡Recomendado!'
      },
      {
        userName: 'María Gómez',
        rating: 4,
        comment: 'Muy buen producto, llegó a tiempo.'
      }
    ]
  };

}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Banner } from '../../models/banner';

@Injectable({
  providedIn: 'root'
})
export class BannerService {

  constructor() { }

  getBanners(): Observable<Banner[]> {
    return of([{
      id: 1,
      subText: 'Pidela Ahora!',
      endDate: '2026-05-21T17:14:00',
      product: {
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
    }, {
      id: 1,
      subText: 'Pidela Ahora!',
      endDate: '2026-05-21T17:14:00',
      product: {
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
    }, {
      id: 1,
      subText: 'Pidela Ahora!',
      endDate: '2026-05-21T17:14:00',
      product: {
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
    }])
  }
}

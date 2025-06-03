import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProductCart } from '../../../../models/product-cart';
import { Order } from '../../../../models/order';
import { LocationService } from '../../../service/location.service';
import { Seller } from '../../../../models/selller';
import { CartService } from '../../../service/cart.service';
import { Product } from '../../../../models/product';
import { SellerService } from '../../../service/seller.service';

@Component({
  selector: 'app-cart-card',
  imports: [CommonModule],
  providers: [CartService],
  templateUrl: './cart-card.component.html',
  styleUrl: './cart-card.component.scss'
})
export class CartCardComponent {

  constructor(
    private locationService: LocationService,
    private cartService: CartService,
    private sellerService: SellerService
  ) {
    this.sellerService.getSeller('123').subscribe((seller: Seller) => {
      this.seller = seller;
    });
  }

  @Input() order: Order = {
    order: '',
    products: [],
    address: '',
    paymentType: '',
    changeFrom: 0,
    sellerId: '',
    status: '',
    buyer: {
      name: '',
      cellphone: ''
    }
  };

  seller: Seller = {
    id: '',
    name: '',
    cellphone: '',
    profileImage: '',
    description: '',
    rating: 0,
    featuredProducts: [],
    products: [],
    comments: [],
  }

  getTotal(productsCart: ProductCart[]) {
    return productsCart.reduce((acc, productCart) => acc + productCart.product.price * productCart.quantity, 0);
  }

  // originalPrice can be null
  getTotalDiscount(productsCart: ProductCart[]) {
    return productsCart.reduce((acc, productCart) => {
      const originalPrice = productCart.product.originalPrice || 0;
      const discount = originalPrice - productCart.product.price;
      if (discount <= 0) {
        return acc; // No discount applied
      }
      return acc + (discount * productCart.quantity);
    }, 0);
  }

  increase(product: ProductCart) {
    product.quantity++;
    this.cartService.updateProductQty(this.order.order, product.product.id, product.quantity);
  }

  decrease(product: ProductCart) {
    product.quantity--;
    if (product.quantity <= 0) {
      this.order.products = this.order.products.filter(p => p.product.id !== product.product.id);
    }
    this.cartService.updateProductQty(this.order.order, product.product.id, product.quantity);
  }

  repeatOrder() {
    this.finishOrder();
  }

  finishOrder() {

    this.getLocation()
      .then((location) => {
        const urlWhatsApp = this.generarMensajeWhatsApp(this.order, location);

        window.open(urlWhatsApp, '_blank')

      })
      .catch((error) => {
        console.error('Error al obtener la ubicación:', error);
      });
  }

  deleteOrder() {
    this.cartService.deleteOrder(this.order.order);
    this.order.products = [];
  }

  async getLocation(): Promise<[number, number]> {
    try {
      const location = await this.locationService.getCurrentLocation();
      return [location.latitude, location.longitude];
    } catch (error) {
      return [0, 0];
    }
  }


  generarMensajeWhatsApp(order: Order, location: [number, number]): string {
    const products = order.products
      .map(
        (productCart) =>
          `■ ${productCart.product.name} x ${productCart.quantity} = ${this.formatCurrency(productCart.product.price * productCart.quantity)}`
      )
      .join('\n');

    let payment = `*Pago por:* ${order.paymentType}`;

    if (order.paymentType === 'Efectivo') {
      payment += `\n*Cambio de:* ${this.formatCurrency(order.changeFrom)}`;
    }

    let address = ``;

    if (location[0] != 0 && location[1] != 0) {
      address = `
*Ubicación:* 
https://maps.google.com/?q=${location[0]},${location[1]}\n`;
    }

    const mensaje = `
*${this.seller.name}*

*Orden Número:* #${order.order}

${products}
*Total:* ${this.formatCurrency(order.products.reduce((acc, productCart) => acc + productCart.product.price * productCart.quantity, 0))}

${payment}

*Dirección:* ${order.address}
${address}
Gracias por tu compra.`.trim();

    // Generar enlace para WhatsApp

    const isMobile = this.isMobileDevice();

    if (isMobile) {
      return `whatsapp://send?phone=${this.seller.cellphone}&text=${encodeURIComponent(mensaje)}`;
    } else {
      return `https://wa.me/${this.seller.cellphone}?text=${encodeURIComponent(mensaje)}`;
    }

  }

  formatCurrency(value: number): string {
    return `$ ${value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  isMobileDevice(): boolean {
    const userAgent = navigator.userAgent;
    // Detectar dispositivos móviles comunes
    return /android|iphone|ipad|ipod/i.test(userAgent);
  }

}




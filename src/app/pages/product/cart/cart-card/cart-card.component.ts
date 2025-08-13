import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ProductCart } from '../../../../models/product-cart';
import { Order } from '../../../../models/order';
import { LocationService } from '../../../service/location.service';
import { CartService } from '../../../service/cart.service';
import { User } from '../../../../models/user';
import { UserService } from '../../../service/user.service';
import { AuthService } from '../../../service/auth.service';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { InputMaskModule } from 'primeng/inputmask';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { UserPayload } from '../../../../models/selllerPayload';
import { v4 as uuidv4 } from 'uuid';
import { ToastService } from '../../../service/toast.service';
import { environment } from '../../../../../environments/environment';
import { CoverageZonesService } from '../../../service/coverage-zones.service';

@Component({
  selector: 'app-cart-card',
  imports: [
    CommonModule, FormsModule, InputTextModule, DropdownModule, 
    InputNumberModule, CheckboxModule, InputMaskModule,
  InputGroupModule, InputGroupAddonModule],
  providers: [CartService, ToastService],
  templateUrl: './cart-card.component.html',
  styleUrl: './cart-card.component.scss'
})
export class CartCardComponent implements OnInit {

  @Input() order: Order = {
    id: '',
    products: [],
    address: '',
    paymentType: '',
    changeFrom: 0,
    sellerId: '',
    status: '',
    buyerId: '',
    location: [0, 0],
    deliveryPrice: 0
  };

  paymentTypes = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' }
  ];

  createAccount = false;
  // rememberAddress = true;

  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';

  seller: User | null = null;

  displayFinishOrder: boolean = false;

  role: string = '';

  allowDelivery: number = 0;

  constructor(
    private readonly locationService: LocationService,
    private readonly cartService: CartService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly coverageZonesService: CoverageZonesService
  ) { }


  ngOnInit(): void {

    //Solicitamos acceso a la ubicación del usuario
    /*this.locationService.requestPermission().catch((error) => {
      console.error('Error al solicitar permiso de ubicación:', error);
    });*/

    this.role = this.authService.getValueFromToken('role');

    if (this.role != '') {
      this.name = this.authService.getValueFromToken('name');
      this.phone = this.authService.getValueFromToken('phone').replace('+57', ''); // Eliminar caracteres no numéricos
    }

    this.order.address = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').address : '';

    this.coverageZonesService.getDeliveryPrice(this.getLocation(), this.order.sellerId).subscribe({
      next: (zone) => {
        console.log('Zona de cobertura:', zone);
        this.order.deliveryPrice = zone.deliveryPrice;
        this.allowDelivery = zone.id !== undefined && zone.id !== null ? 1 : -1;
      }
    });

    this.userService.getUserById(this.order.sellerId).subscribe({
      next: (response: User) => {
        this.seller = response;
      }
    });
  }

  closePreview(): void {
    this.displayFinishOrder = false;
  }

  openFinishOrder(): void {
    this.displayFinishOrder = true;
  }

  getTotal(productsCart: ProductCart[]) : number{
    return productsCart.reduce((acc, productCart) => acc + productCart.product.price * productCart.quantity, 0) + (this.order.deliveryPrice || 0);
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
    this.cartService.updateProductQty(this.order.id, product.product.id, product.quantity);
  }

  decrease(product: ProductCart) {
    product.quantity--;
    if (product.quantity <= 0) {
      this.order.products = this.order.products.filter(p => p.product.id !== product.product.id);
    }
    this.cartService.updateProductQty(this.order.id, product.product.id, product.quantity);
  }

  repeatOrder() {
    this.finishOrder();
  }

  finishOrder() {

    /*if (this.rememberAddress) {
      localStorage.setItem('address', this.order.address);
    } else {
      localStorage.removeItem('address');
    }*/

    const userId = this.authService.getValueFromToken('userId');
    
    if (userId) {
      this.userService.updateUser(userId, {
        name: this.name,
        phone: '+57'.concat(this.phone)
      }).subscribe({
        next: () => {
          this.order.buyerId = userId;
          this.finishOrderAndSendWhatsApp();
        },
        error: (err) => {
          this.toastService.showError('Error', err.message);
        }
      });
    } else {
      const payload: UserPayload = {
        userId: !userId ? uuidv4() : userId,
        name: this.name,
        businessName: '',
        image: '',
        email: this.email || uuidv4(),
        phone: this.phone,
        password: this.password,
        exist: false,
        frontUrl: environment.frontUrl,
        backUrl: environment.apiUrl
      };
      this.authService.createClient(payload).subscribe({
        next: (token: string) => {
          this.authService.setToken(token);
          this.order.buyerId = this.authService.getValueFromToken('userId');
          this.role = 'BUYER';
          this.finishOrderAndSendWhatsApp();
        },
        error: (err) => {
          this.toastService.showError('Error', err.message);
        }
      });
    }
    
  }

  finishOrderAndSendWhatsApp() {
    const location = this.getLocation();
    this.order.location = location;
    this.continueOrder();
  }

  continueOrder() {
    const urlWhatsApp = this.generarMensajeWhatsApp(this.order);

    // Enviar orden al backend
    this.cartService.sendOrder(this.order).subscribe({
      next: (response) => {
        this.cartService.deleteOrder(this.order.id);
        this.openWhatsApp(urlWhatsApp);
      },
      error: (err) => {
        console.error(err);
        this.openWhatsApp(urlWhatsApp);
      }
    });
  }

  openWhatsApp(urlWhatsApp: string) {
    window.open(urlWhatsApp, '_blank')

    this.displayFinishOrder = false;

    window.location.reload();
  }

  deleteOrder() {
    this.cartService.deleteOrder(this.order.id);
    this.order.products = [];
  }

  getLocation(): [number, number] {
    try {
      return [localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').latitude : 0,
        localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').longitude : 0];
    } catch (error) {
      return [0, 0];
    }
  }

  getSelectedOptions(selectedOptions: { [key: string]: any } | undefined): string {
    if (!selectedOptions) return '';
    return `\n${Object.entries(selectedOptions)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}\n`;
  }


  generarMensajeWhatsApp(order: Order): string {
    const products = order.products
      .map(
        (productCart) =>
          `■ ${productCart.product.name} x ${productCart.quantity} = ${this.formatCurrency(productCart.product.price * productCart.quantity)} ${this.getSelectedOptions(productCart.selectedOptions)}`
      )
      .join('\n');

    let payment = `*Pago por:* ${order.paymentType}`;

    if (order.paymentType === 'EFECTIVO') {
      payment += `\n*Cambio de:* ${this.formatCurrency(order.changeFrom)}`;
    }

    let address = ``;

    if (order.location[0] != 0 && order.location[1] != 0) {
      address = `
*Ubicación (Aproximada):* 
https://maps.google.com/?q=${order.location[0]},${order.location[1]}\n`;
    }

    const mensaje = `
*${this.seller?.name}*

*Orden:* ${order.id}

${products}*Domicilio:* ${this.formatCurrency(order.deliveryPrice || 0)}
*Total:* ${this.formatCurrency(this.getTotal(order.products))}

${payment}

*Dirección:* ${order.address}
${address}
*Confirmar orden:*
${environment.frontUrl}/auth/confirm/${order.id}\n
*No se concretó el pedido? Cancelar orden:*
${environment.frontUrl}/auth/cancel/${order.id}\n
Gracias por tu compra.`.trim();

    // Generar enlace para WhatsApp

    const isMobile = this.isMobileDevice();

    if (isMobile) {
      return `whatsapp://send?phone=${this.seller?.phone}&text=${encodeURIComponent(mensaje)}`;
    } else {
      return `https://wa.me/${this.seller?.phone}?text=${encodeURIComponent(mensaje)}`;
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

  getDeliveryPrice(): string|number {
    return this.order.deliveryPrice || 0;
  }

}




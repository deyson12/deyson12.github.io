import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { TabViewModule } from 'primeng/tabview';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user';
import { Banner } from '../../../models/banner';
import { Category } from '../../../models/category';
import { Plan } from '../../../models/plan';
import { Subscription } from '../../../models/subscription';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { UserService } from '../../service/user.service';
import { CategoryService } from '../../service/category.service';
import { BannerService } from '../../service/banner.service';
import { PlanService } from '../../service/plan.service';
import { GenericResponse } from '../../../models/genericResponse';
import { Order } from '../../../models/order';
import { OrderService } from '../../service/order.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, TableModule, InputTextModule, ButtonModule, TagModule, CalendarModule,
    TabViewModule, FormsModule, IconFieldModule, InputIconModule, SelectModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  users: User[] = [];
  banners: Banner[] = [];
  categories: Category[] = [];
  plans: Plan[] = [];
  subscriptions: Subscription[] = [];

  /*
  export interface Order {
    id: string;
    sellerId: string;
    buyerId: string;
    products: ProductCart[];
    status: string;
    address: string;
    paymentType: string;
    changeFrom: number;
    location: [number, number];
    deliveryPrice?: number;
  }
    */
  pendingOrders: Order[] = [];

  userStatuses = [
    { label: 'Inicial', value: 'INICIAL', color: 'warn' },
    { label: 'Pendiente', value: 'PENDIENTE', color: 'info' },
    { label: 'Confirmado', value: 'CONFIRMADO', color: 'secondary' },
    { label: 'Habilitado', value: 'HABILITADO', color: 'success' },
    { label: 'Deshabilitado', value: 'DESHABILITADO', color: 'danger' }
  ];

  constructor(
    private readonly userService: UserService,
    private readonly categoryService: CategoryService,
    private readonly bannerService: BannerService,
    private readonly planService: PlanService,
    private readonly orderService: OrderService
  ) { }

  ngOnInit(): void {

    this.loadUsers();

    this.categoryService.getAllCategories().subscribe(categories => {
      this.categories = categories;
    });

    this.bannerService.getBanners().subscribe(banners => {
      this.banners = banners;
    });

    this.planService.getPlans().subscribe(plans => {
      this.plans = plans;

      this.subscriptions = [
        { id: '1', user: this.users[0], plan: this.plans[0], startDate: '2025-06-01', endDate: '2025-06-30', isActive: true }
      ];

    });

    this.orderService.getPendingOrders().subscribe(orders => {
      this.pendingOrders = orders;
    });
  }

  loadUsers() {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  getSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
    return this.userStatuses.find(s => s.value === status)?.color as 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';
  }

  enable(user: User): void {
    this.userService.changeStatus(user.id, 'HABILITADO').subscribe({
      next: (response: GenericResponse) => {
        this.loadUsers();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  disable(user: User): void {
    this.userService.changeStatus(user.id, 'DESHABILITADO').subscribe(() =>
      this.loadUsers()
    );
  }

  deleteBanner(banner: Banner): void {
    this.banners = this.banners.filter(b => b.id !== banner.id);
  }

  saveBanner(banner: Banner): void {
    // TODO: API para guardar cambios
  }

  addCategory(): void {
    this.categories.push({
      id: Date.now().toString(),
      name: 'Nueva Categoría',
      icon: 'pi pi-tag',
      status: true,
      code: 'NEW',
      order: this.categories.length + 1
    });
  }

  toggleCategory(cat: Category): void {
    cat.status = !cat.status;
  }

  addPlan(): void {
    this.plans.push({
      id: Date.now().toString(),
      name: 'Nuevo Plan',
      price: 0,
      durtationDays: 30,
      productLimit: 0,
      featuredLimit: 0,
      prioritySearch: 0,
      isDefault: false
    });
  }

  deletePlan(plan: Plan): void {
    this.plans = this.plans.filter(p => p.id !== plan.id);
  }

  savePlan(plan: Plan): void {
    // TODO: API para guardar
  }

  toggleSubscription(sub: Subscription): void {
    sub.isActive = !sub.isActive;
  }

  sendWhatsApp(order: Order): void {
    
    const message = `Hola, el pedido con *ID ${order.id}* está pendiente de ser procesado.  
Para generar la factura y evitar reprocesos, es necesario que confirme la orden o la cancele cuanto antes.

Para realizarlo por favor ingresar al link ${environment.frontUrl}/pages/my-sales`;
    const phoneNumber = order.seller?.phone;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  sendWhatsAppToBuyer(order: Order): void {

    const message = `Hola, el día *${this.formatDate(order.createdAt)}* se generó el pedido con *ID ${order.id.split('-')[0]}*, nos puedes informar por favor si dicho pedido fue entregado.

Detalle del pedido:

*Vendedor:*  ${order.seller?.businessName} (${order.seller?.name})
*Productos:* ${order.products.map(p => `${p.product.name} x ${p.quantity}`).join(', ')}
*Dirección:* ${order.address}

Te agradecemos tu pronta respuesta, esto nos ayudará a mejorar nuestro servicio.`;

    const url = `https://wa.me/${order.buyer?.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    // Formatear como ejemplo 01 de enero de 2023 en español
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  }

  cancelOrder(order: Order): void {
    // TODO: Implementar cancelación de orden
  }

  confirmOrder(order: Order): void {

  }

}

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
import { DropdownModule } from 'primeng/dropdown';
import { UserService } from '../../service/user.service';
import { CategoryService } from '../../service/category.service';
import { BannerService } from '../../service/banner.service';
import { PlanService } from '../../service/plan.service';
import { Invoice } from '../../../models/invoice';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, TagModule, CalendarModule, TabViewModule, FormsModule, IconFieldModule, InputIconModule, DropdownModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
users: User[] = [];
  banners: Banner[] = [];
  categories: Category[] = [];
  plans: Plan[] = [];
  subscriptions: Subscription[] = [];


  invoices: Invoice[] = [
    {
      id: '123',
      sellerName: 'Nombre',
      month: 'Julio 2025'
    }
  ];

  userStatuses = [
    { label: 'Inicial', value: 'INICIAL', color: 'warn' },
    { label: 'Pendiente', value: 'PENDIENTE', color: 'info'  },
    { label: 'Confirmado', value: 'CONFIRMADO', color: 'secondary'  },
    { label: 'Habilitado', value: 'HABILITADO', color: 'success'  }
  ];
  
  constructor(
    private readonly userService: UserService,
    private readonly categoryService: CategoryService,
    private readonly bannerService: BannerService,
    private readonly planService: PlanService,
    private readonly datePipe: DatePipe
  ) { }

  ngOnInit(): void {

    // Cargados desde BD
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });

    this.categoryService.getAllCategories().subscribe(categories => {
      this.categories = categories;
    });

    this.bannerService.getBanners().subscribe(banners => {
      this.banners = banners;
    });

    this.planService.getPlans().subscribe(plans => {
      this.plans = plans;

      this.subscriptions = [
      { id:'1', user:this.users[0], plan:this.plans[0], startDate:'2025-06-01', endDate:'2025-06-30', isActive:true }
    ];

    });
  }

  getSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined {
    return this.userStatuses.find(s => s.value === status)?.color as 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';
  }

  toggleUser(user: User): void {
    user.status = user.status === 'active' ? 'inactive' : 'active';
    // TODO: Llamar a tu API
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

  getWhatsAppLink(invoice: Invoice): string {
    // Mensaje crudo con saltos de línea
    const rawMessage = 
      `¡Hola ${invoice.sellerName}!\n` +
      `Tienes pendiente la factura (ID: ${invoice.id}) del mes de ` +
      `${this.datePipe.transform(invoice.month, 'MMMM yyyy')}.\n` +
      `Por favor, realiza el pago lo antes posible.\n` +
      `¡Gracias!`;

    const encoded = encodeURIComponent(rawMessage);
    return `https://wa.me/573136090247?text=${encoded}`;
  }

}

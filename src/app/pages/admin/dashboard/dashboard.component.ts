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

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, TagModule, CalendarModule, TabViewModule, FormsModule, IconFieldModule, InputIconModule, DropdownModule],
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

  userStatuses = [
    { label: 'Inicial', value: 'INICIAL', color: 'warn' },
    { label: 'Pendiente', value: 'PENDIENTE', color: 'info'  },
    { label: 'Confirmado', value: 'CONFIRMADO', color: 'secondary'  },
    { label: 'Habilitado', value: 'HABILITADO', color: 'success'  }
  ];
  
  constructor(
    private readonly userService: UserService,
    private readonly categoryService: CategoryService,
    private readonly bannerService: BannerService
  ) { }

  ngOnInit(): void {
    // TODO: Reemplazar con llamadas a tus servicios
    this.users = [
      { id:'1', name:'Juan', businessName:'Panadería la 7', description: '', email:'juan@ejemplo.com', phone:'3001234567', role:'seller', image:'', status:'active', facebookUrl:'', instagramUrl:'', twitterUrl:'', linkedinUrl:'' }
    ];
    
    this.banners = [
      { id:'1', product:{id:'p1',name:'Hamburguesa',shortDescription:'Hamburguesa', stars:3, image:'Hamburguesa', price:3000, originalPrice: 4000, sales: 4, seller: ''}, startDate:'2025-06-01', endDate:'2025-06-30', subtext:'Promo 2x1', type:'sale', endTimerDate:'2025-06-30', priority:1 }
    ];
    this.categories = [
      { id:'1', name:'Comidas', icon:'pi pi-cutlery', status:true, code:'FOOD', order:1 }
    ];
    this.plans = [
      { id:'1', name:'Básico', price:30000, durtationDays:30, productLimit:10, featuredLimit:1, prioritySearch:0, isDefault:true }
    ];
    this.subscriptions = [
      { id:'1', user:this.users[0], plan:this.plans[0], startDate:'2025-06-01', endDate:'2025-06-30', isActive:true }
    ];

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

}

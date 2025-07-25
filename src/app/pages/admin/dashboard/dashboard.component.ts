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

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, TagModule, CalendarModule,
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
    private readonly planService: PlanService
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
          console.log(response.code);
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

}

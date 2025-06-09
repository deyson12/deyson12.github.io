import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { Category } from '../../models/category';
import { CategoryService } from '../../pages/service/category.service';
import { AuthService } from '../../pages/service/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu implements OnInit {

  role: string | null = null;

  model: MenuItem[] = [];

  constructor(
    private categoryService: CategoryService,
    private auth: AuthService
  ) { }

  ngOnInit() {

    this.role = this.auth.getValueFromToken('role');

    const profileGroup: MenuItem = {
      label: 'Perfil vendedor',
      items: [
        { label: 'Mi perfil', icon: 'mdi:account', routerLink: ['/pages/profile'] },
        { label: 'Mis ventas', icon: 'mdi:cash-register', routerLink: ['/pages/my-sales'] },
        { label: 'Plan y Pagos', icon: 'mdi:help-circle', routerLink: ['/pages/help'] },
        { label: 'Cerrar sesión', icon: 'mdi:logout', routerLink: ['/pages/logout'] }
      ]
    };

    const sellersGroup: MenuItem = {
      label: 'Vendedores',
      items: [
        { label: 'Tiendita de Legos - Juan Pérez', icon: 'mdi:account', routerLink: ['/pages/seller-profile'] }
      ]
    };

    this.categoryService.getActiveCategories().subscribe({
      next: (categories: Category[]) => {

        const categoriesGroup: MenuItem = {
          label: 'Categorías',
          items: [
            {
              label: 'Todos',
              icon: 'material-symbols-light:package',
              routerLink: ['all']
            },
            ...categories.map(cat => ({
              label: cat.name,
              icon: cat.icon,
              routerLink: ['/pages/' + cat.code]
            }))
          ]
        };


        this.model = [
          ...(this.role === 'seller' ? [profileGroup] : []),
          categoriesGroup,
          // sellersGroup
        ];
      },
      error: err => {
        console.error('Error cargando categorías', err);
        this.model = [
          ...(this.role === 'seller' ? [profileGroup] : []),
          // sellersGroup
        ];
      }
    });
  }
}
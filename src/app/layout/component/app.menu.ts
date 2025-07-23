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
  template: `<ul class="layout-menu max-sm:pt-[60px]">
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

    const adminGroup: MenuItem = {
      label: 'Administrador',
      items: [
        { label: 'Dashboard', icon: 'mdi:view-grid', routerLink: ['/pages/dashboard'] },
        { label: 'Facturas', icon: 'icon-park-outline:bill', routerLink: ['/pages/invoice'] },
        { label: 'Cache', icon: 'mdi:cached', routerLink: ['/pages/cache'] },
        { label: 'Dropshipping ', icon: 'hugeicons:package', routerLink: ['/pages/dropshipping'] },
        { label: 'Pruebas', icon: 'mdi:test-tube', routerLink: ['/pages/test'] },
      ]
    };

    const profileGroup: MenuItem = {
      label: 'Perfil vendedor',
      items: [
        { label: 'Mi perfil', icon: 'mdi:account', routerLink: ['/pages/profile'] },
        { label: 'Mis ventas', icon: 'mdi:cash-register', routerLink: ['/pages/my-sales'] },
        { label: 'Pagos', icon: 'mdi:currency-usd', routerLink: ['/pages/payment'] },
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
          ...(this.role === 'admin' ? [adminGroup] : []),
          ...(this.role === 'seller' || this.role === 'admin' ? [profileGroup] : []),
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
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { Category } from '../../models/category';
import { CategoryService } from '../../pages/service/category.service';
import { AuthService } from '../../pages/service/auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule, ButtonModule],
  template: `<ul class="layout-menu max-sm:pt-[110px]">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
        </ul> 
        @if (!userId) {
          <ul class="block md:hidden layout-menu max-sm:pt-[10px]">
          <ng-container>
            <li>
              <button pButton type="button" icon="pi pi-power-off" label="Iniciar Sesión" routerLink="/auth/login">
              </button>
            </li>
        </ng-container>
        </ul>
        } @else {
          <ul class="block md:hidden layout-menu max-sm:pt-[10px]">
          <ng-container>
            <li>
              <button pButton type="button" icon="pi pi-power-off" label="Cerrar Sesión" routerLink="/pages/logout">
                  </button>
            </li>
        </ng-container>
        </ul>
        }
    `
})
export class AppMenu implements OnInit {

  userId: string = '';
  role: string | null = null;

  model: MenuItem[] = [];

  constructor(
    private categoryService: CategoryService,
    private auth: AuthService
  ) { }

  ngOnInit() {

    this.role = this.auth.getValueFromToken('role');
    this.userId = this.auth.getValueFromToken('userId');

    const adminGroup: MenuItem = {
      label: 'Administrador',
      items: [
        { label: 'Dashboard', icon: 'streamline-color:dashboard-3-flat', routerLink: ['/pages/dashboard'] },
        { label: 'Facturas', icon: 'icon-park:bill', routerLink: ['/pages/invoice'] },
        { label: 'Cache', icon: 'streamline-color:database-refresh-flat', routerLink: ['/pages/cache'] },
        { label: 'Dropshipping ', icon: 'noto:package', routerLink: ['/pages/dropshipping'] },
        { label: 'Scraper', icon: 'fluent-color:code-block-32', routerLink: ['/pages/scraper'] },
        { label: 'Pruebas', icon: 'fluent-emoji-flat:test-tube', routerLink: ['/pages/test'] },
      ]
    };

    const profileGroup: MenuItem = {
      label: 'Perfil vendedor',
      items: [
        { label: 'Mi perfil', icon: 'streamline-plump-color:user-multiple-accounts-flat', routerLink: ['/pages/profile'] },
        { label: 'Mis ventas', icon: 'emojione:bar-chart', routerLink: ['/pages/my-sales'] },
        { label: 'Mis zonas de cobertura', icon: 'fluent-color:location-ripple-20', routerLink: ['/pages/coverage-zones'] },
        { label: 'Pagos', icon: 'streamline-color:dollar-coin-flat', routerLink: ['/pages/payment'] },
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
              icon: 'twemoji:shopping-bags',
              routerLink: ['all']
            },
            ...categories.map(cat => ({
              label: cat.name,
              icon: cat.icon,
              routerLink: ['/pages/products/' + cat.code]
            })),
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
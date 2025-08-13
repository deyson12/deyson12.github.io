import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from '../app.menuitem';
import { Category } from '../../../models/category';
import { CategoryService } from '../../../pages/service/category.service';
import { AuthService } from '../../../pages/service/auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule, ButtonModule],
  templateUrl: './app.menu.component.html',
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
        { label: 'Facturas', icon: 'streamline-sharp-color:bill-dollar-1-flat', routerLink: ['/pages/invoice'] },
        { label: 'Cache', icon: 'streamline-color:database-refresh-flat', routerLink: ['/pages/cache'] },
        { label: 'Ordenes', icon: 'streamline-ultimate-color:checklist', routerLink: ['/pages/orders'] },
        { label: 'Dropshipping ', icon: 'noto:package', routerLink: ['/pages/dropshipping'] },
        { label: 'Scraper', icon: 'fluent-color:code-block-32', routerLink: ['/pages/scraper'] },
        { label: 'Pruebas', icon: 'fluent-emoji-flat:test-tube', routerLink: ['/pages/test'] },
      ]
    };

    const profileGroup: MenuItem = {
      label: 'Perfil vendedor',
      items: [
        { label: 'Mi perfil', icon: 'streamline-plump-color:user-multiple-accounts-flat', routerLink: ['/pages/profile'] },
        { label: 'Mis productos', icon: 'fluent-emoji-flat:card-file-box', routerLink: ['/pages/my-products'] },
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
          ...(this.role === 'ADMIN' ? [adminGroup] : []),
          ...(this.role === 'SELLER' || this.role === 'ADMIN' ? [profileGroup] : []),
          categoriesGroup,
          // sellersGroup
        ];
      },
      error: err => {
        console.error('Error cargando categorías', err);
        this.model = [
          ...(this.role === 'SELLER' ? [profileGroup] : []),
          // sellersGroup
        ];
      }
    });
  }
}
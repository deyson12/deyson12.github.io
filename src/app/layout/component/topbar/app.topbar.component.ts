import { Component, computed, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../../service/layout.service';
import { AppConfigurator } from '../app.configurator';
import { AuthService } from '../../../pages/service/auth.service';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { CartService } from '../../../pages/service/cart.service';
import { Product } from '../../../models/product';
import { ProductService } from '../../../pages/service/product.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { debounceTime, distinctUntilChanged, filter, Subject, switchMap, takeUntil } from 'rxjs';

@Component({
    selector: 'app-topbar',
    imports: [
        ReactiveFormsModule,
        FormsModule,
        RouterModule,
        CommonModule,
        StyleClassModule,
        AppConfigurator,
        PopoverModule,
        ButtonModule,
        InputGroupModule,
        InputGroupAddonModule,
        InputTextModule
    ],
    templateUrl: './app.topbar.component.html',
})
export class AppTopbarComponent implements OnInit, OnDestroy {

    role: string = '';
    plan: string = '';
    userId: string = '';
    name: string = '';

    items!: MenuItem[];

    // ===== Buscador =====
    productSearchTerm = '';
    showMobileSearch = false;
    filteredProducts: Product[] = [];

    private readonly destroy$ = new Subject<void>();

    searchCtrl = new FormControl<string>('', { nonNullable: true });
    cartCount = 3;

    @ViewChild('op') popover!: Popover;

    constructor(
        public layoutService: LayoutService,
        private readonly authService: AuthService,
        public cartService: CartService,
        private readonly productService: ProductService,
        private readonly router: Router
    ) { }

    ngOnInit(): void {
        this.role = this.authService.getValueFromToken('role');
        this.plan = this.authService.getValueFromToken('plan');
        this.userId = this.authService.getValueFromToken('userId');
        this.name = this.authService.getValueFromToken('name');

        this.searchCtrl.valueChanges.pipe(
            debounceTime(1000),                       // 300 ms de espera tras el último tecleo
            filter((q: string) => q.length >= 3),    // sólo si hay al menos 3 caracteres
            distinctUntilChanged(),                  // evita peticiones idénticas
            switchMap(q => this.productService.getAllProductsByQuery(q)), // tu endpoint con limit=10
            takeUntil(this.destroy$)
        ).subscribe(results => this.filteredProducts = results ?? []);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    viewAll() {
    const q = this.searchCtrl.value.trim();
    if (q) {
      this.router.navigate(['/pages/all-filtered', q]);
      // opcional: limpiar sugerencias
      this.filteredProducts = [];
    }
  }

    /*onSearchInput() {
        const term = this.productSearchTerm.trim().toLowerCase();
        if (term.length >= 3) {
            this.productService.getAllProductsByQuery(term).subscribe({
                next: (products) => {
                    this.filteredProducts = products || [];
                },
                error: (error) => {
                    console.error('Error fetching products:', error);
                    this.filteredProducts = [];
                }
            });
        } else {
            this.filteredProducts = [];
        }
    }*/

    onProductSelect(product: Product) {
        // cerrar dropdown y ejecutar tu lógica
        this.showMobileSearch = false;
        this.productSearchTerm = product.name;
        this.filteredProducts = [];
        this.handleProductSelect(product);
    }

    handleProductSelect(product: Product) {
        this.router.navigate(
            ['/pages/product-detail', product.id],
            { state: { product } }
        );
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);

    toggle(event: Event): void {
        this.popover.toggle(event);
    }

    logout(): void {
        //this.identityService.fullLogout();
    }

}

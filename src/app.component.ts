import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PromoPopupComponent } from './app/pages/product/promo-popup/promo-popup.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HealthService } from './app/pages/service/health.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AppFloatingConfigurator } from './app/layout/component/app.floatingconfigurator';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterModule,
        ToastModule,
        ProgressSpinnerModule,
        AppFloatingConfigurator
        //PromoPopupComponent,
    ],
    providers: [MessageService],
    styles: [`
        .p-progressspinner-spin {
            color: var(--primary-color);
        }
    `],
    template: `
<app-floating-configurator />
    @if (loading) {
       <div class="fixed inset-0 bg-white flex justify-center items-center z-50">
            <p-progressSpinner styleClass="w-12 h-12 text-gray-700" [style]="{ stroke: 'var(--primary-color)' }"></p-progressSpinner>
        </div>
    } @else {
        <router-outlet></router-outlet>
        <p-toast position="top-right"></p-toast><!--app-promo-popup></app-promo-popup-->
    }    
    `
})
export class AppComponent {

    loading = true;

    constructor(private readonly healthService: HealthService) {
        this.healthService.checkHealth().subscribe({
            next: () => {
                this.loading = false;
            }
        });
    }

}

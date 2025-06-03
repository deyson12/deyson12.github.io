import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PromoPopupComponent } from './app/pages/product/promo-popup/promo-popup.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, 
        ToastModule, 
        //PromoPopupComponent,
    ],
    providers: [MessageService],
    template: `<router-outlet></router-outlet><p-toast position="top-right"></p-toast><!--app-promo-popup></app-promo-popup-->`
})
export class AppComponent {}

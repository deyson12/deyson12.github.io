// promo-popup.component.ts
import { Component, OnInit } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-promo-popup',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './promo-popup.component.html',
  styles: [`
    :host ::ng-deep .custom-promo-dialog .p-dialog-panel {
      border-radius: 1rem !important;
      overflow: hidden !important;
    }
    :host ::ng-deep .custom-promo-dialog .p-dialog-content {
      padding: 0 !important;
    }
  `]
})
export class PromoPopupComponent implements OnInit {
  showPromo = false;
  ngOnInit() {
    setTimeout(() => this.showPromo = true, 500);
  }
  close() {
    this.showPromo = false;
  }
}

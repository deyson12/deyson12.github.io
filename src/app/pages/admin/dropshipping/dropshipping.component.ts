import { CommonModule, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dropshipping',
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './dropshipping.component.html',
  styleUrl: './dropshipping.component.scss'
})
export class DropshippingComponent {
  cost = 0;
  costStr = '';

  shippingCost = 10000;
  shippingCostStr = '';

  marginRate = 0.20; // 20 % de margen

  constructor(private decimalPipe: DecimalPipe) {
    this.shippingCostStr = this.decimalPipe.transform(this.shippingCost, '1.0-0')!;
  }

  onCostInput(value: string) {
    const cleaned = value.replace(/\./g, '');
    const num = parseInt(cleaned, 10);
    this.cost = isNaN(num) ? 0 : num;
    this.costStr = this.decimalPipe.transform(this.cost, '1.0-0')!;
  }

  getPrice(): number {
    const marginAmt = this.cost * this.marginRate;
    return this.cost + this.shippingCost + marginAmt;
  }
}

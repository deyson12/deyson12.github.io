// banner.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Banner } from '../../../models/banner';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { ProductService } from '../../service/product.service';
import { Product } from '../../../models/product';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss']
})
export class BannerComponent implements OnInit, OnDestroy {

  constructor(private readonly productService: ProductService) { }

  @Input() banner: Banner | null = null;
  @Input() gradientClasses = 'bg-gradient-to-r from-orange-500 via-orange-600 to-yellow-400';
  @Input() buttonColor = 'text-orange-600';

  remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  showTimer = false;
  showBanner = true;
  private sub?: Subscription;

  ngOnInit() {
    // Si no hay endTimerDate, mostramos banner sin timer
    if (!this.banner?.endTimerDate) return;

    const target = new Date(this.banner?.endTimerDate).getTime();
    // Si la fecha es inválida, pasada o igual al momento actual, ocultamos todo el banner
    if (isNaN(target) || target <= Date.now()) {
      this.showBanner = false;
      return;
    }

    // Fecha válida y futura: mostramos timer
    this.showTimer = true;
    this.updateRemaining();
    this.sub = interval(1000).subscribe(() => this.updateRemaining());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private updateRemaining() {
    const now = Date.now();
    const target = new Date(this.banner?.endTimerDate!).getTime();
    const diff = target - now;
    if (diff <= 0) {
      // Cuando el timer llega a cero, ocultamos todo el banner
      this.showTimer = false;
      this.showBanner = false;
      this.sub?.unsubscribe();
      return;
    }
    const secs = Math.floor(diff / 1000);
    this.remaining.days = Math.floor(secs / 86400);
    this.remaining.hours = Math.floor((secs % 86400) / 3600);
    this.remaining.minutes = Math.floor((secs % 3600) / 60);
    this.remaining.seconds = secs % 60;
  }

  getDiscount(product: Product): string {
    return this.productService.getDiscount(product);
  }
}

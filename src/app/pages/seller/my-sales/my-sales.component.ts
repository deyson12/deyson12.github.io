import { Component, OnDestroy, OnInit } from '@angular/core';
import { LayoutService } from '../../../layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';

@Component({
  selector: 'app-my-sales',
  imports: [CommonModule, ChartModule, FluidModule],
  templateUrl: './my-sales.component.html',
  styleUrl: './my-sales.component.scss'
})
export class MySalesComponent implements OnInit, OnDestroy {
  lineData: any;
  barData: any;
  lineOptions: any;
  barOptions: any;
  private subscription: Subscription;

  constructor(private layoutService: LayoutService) {
    this.subscription = this.layoutService.configUpdate$
      .pipe(debounceTime(25))
      .subscribe(() => this.initCharts());
  }

  ngOnInit() {
    this.initCharts();
  }

  initCharts() {
    const docStyle = getComputedStyle(document.documentElement);
    const textColor = docStyle.getPropertyValue('--text-color');
    const textColorSecondary = docStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = docStyle.getPropertyValue('--surface-border');
    const primary = docStyle.getPropertyValue('--p-primary-500');
    const primaryLight = docStyle.getPropertyValue('--p-primary-200');

    // Datos de ejemplo: ingresos mensuales (en COP)
    this.lineData = {
      labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'],
      datasets: [
        {
          label: 'Ingresos (COP)',
          data: [120000, 150000, 170000, 140000, 190000, 210000, 230000],
          fill: false,
          borderColor: primary,
          tension: 0.4,
        }
      ]
    };
    this.lineOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } }
      }
    };

    // Datos de ejemplo: ventas por producto
    const labels = ['Producto 1', 'Producto 2', 'Producto 3', 'Producto 4', 'Producto 5'];
    const pendingSales = [5, 3, 2, 1, 4];
    const confirmedSales = [10, 7, 5, 2, 8];

    this.barData = {
      labels,
      datasets: [
        {
          label: 'Ventas Pendientes',
          backgroundColor: primaryLight,
          borderColor: primaryLight,
          data: pendingSales,
        },
        {
          label: 'Ventas Confirmadas',
          backgroundColor: primary,
          borderColor: primary,
          data: confirmedSales,
        }
      ]
    };
    this.barOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } }
      }
    };
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

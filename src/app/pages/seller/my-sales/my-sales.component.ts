import { Component, OnDestroy, OnInit } from '@angular/core';
import { LayoutService } from '../../../layout/service/layout.service';
import { debounceTime, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FluidModule } from 'primeng/fluid';
import { SellerService } from '../../service/seller.service';
import { AuthService } from '../../service/auth.service';

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
  private readonly subscription: Subscription;

  dailySales = 0;
  monthlySales = 0;
  yearlySales = 0;
  pendingSales = 0;
  canceledSales = 0;

  docStyle!: CSSStyleDeclaration;
  textColor: string = '';
  textColorSecondary: string = '';
  surfaceBorder: string = '';
  primary: string = '';
  primaryLight: string = '';

  constructor(
    private readonly layoutService: LayoutService,
    private readonly sellerService: SellerService,
    private readonly authService: AuthService

  ) {
    this.subscription = this.layoutService.configUpdate$
      .pipe(debounceTime(25))
      .subscribe(() => this.initCharts());
  }

  ngOnInit() {
    this.initAll();
  }

  refreshAll(): void {
    this.initAll();
  }

  initAll() {
    this.initCharts();

    this.sellerService.getSalesSumary(this.authService.getValueFromToken('userId')).subscribe({
      next: (summary) => {
        this.dailySales = summary.dailySales | 0;
        this.monthlySales = summary.monthlySales | 0;
        this.yearlySales = summary.yearlySales | 0;
        this.pendingSales = summary.pendingSales | 0;
        this.canceledSales = summary.canceledSales | 0;
      },
      error: (error) => {
        console.error('Error al obtener el resumen de ventas:', error);
      }
    });
  }

  initCharts() {

    this.docStyle = getComputedStyle(document.documentElement);
    this.textColor = this.docStyle.getPropertyValue('--text-color');
    this.textColorSecondary = this.docStyle.getPropertyValue('--text-color-secondary');
    this.surfaceBorder = this.docStyle.getPropertyValue('--surface-border');
    this.primary = this.docStyle.getPropertyValue('--p-primary-500');
    this.primaryLight = this.docStyle.getPropertyValue('--p-primary-200');

    // Datos de ejemplo: ingresos mensuales (en COP)
    this.initLast6MonthsChart();

    // Datos de ejemplo: ventas por producto
    this.initSalesByProductLastMonthsChart();
  }

  initLast6MonthsChart() {
    this.sellerService.getSalesLastMonths(this.authService.getValueFromToken('userId')).subscribe({
      next: (salesLast6Months) => {
        this.lineData = {
          labels: salesLast6Months[0].months,
          datasets: [
            {
              label: 'Ingresos (COP)',
              data: salesLast6Months[0].data,
              fill: false,
              borderColor: this.primary,
              tension: 0.4,
            },
            {
              label: 'Pendientes (COP)',
              data: salesLast6Months[1].data,
              fill: false,
              borderColor: this.primaryLight,
              tension: 0.4,
            }
          ]
        };
        this.lineOptions = {
          maintainAspectRatio: false,
          aspectRatio: 0.6,
          plugins: {
            legend: { labels: { color: this.textColor } }
          },
          scales: {
            x: { ticks: { color: this.textColorSecondary }, grid: { color: this.surfaceBorder } },
            y: { ticks: { color: this.textColorSecondary }, grid: { color: this.surfaceBorder } }
          }
        };
      },
      error: (error) => {
        console.error('Error al obtener el resumen de ventas:', error);
      }
    });
  }

  initSalesByProductLastMonthsChart() {
    this.sellerService.getSalesByProductLastMonths(this.authService.getValueFromToken('userId')).subscribe({
      next: (salesByProductLast6Months) => {
        const productNames = salesByProductLast6Months.productNames;
        const pendingSales = salesByProductLast6Months.pendingSales;
        const confirmedSales = salesByProductLast6Months.confirmedSales;
        const canceledSales = salesByProductLast6Months.canceledSales;

        this.barData = {
          labels: productNames,
          datasets: [
            {
              label: 'Ventas Pendientes',
              backgroundColor: this.primaryLight,
              borderColor: this.primaryLight,
              data: pendingSales,
            },
            {
              label: 'Ventas Confirmadas',
              backgroundColor: this.primary,
              borderColor: this.primary,
              data: confirmedSales,
            },
            {
              label: 'Ventas Canceladas',
              backgroundColor: this.textColorSecondary,
              borderColor: this.textColorSecondary,
              data: canceledSales,
            }
          ]
        };
        this.barOptions = {
          indexAxis: 'y',
          maintainAspectRatio: false,
          aspectRatio: 0.6,
          plugins: {
            legend: { labels: { color: this.textColor } }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                color: this.textColorSecondary,
                precision: 0,     // 0 decimales
                stepSize: 1,      // salto de 1 en 1
                callback: (v: number) => v // devuelve el valor tal cual
              },
              grid: { color: this.surfaceBorder }
            },
            y: {
              ticks: {
                color: this.textColorSecondary
              },
              grid: { color: this.surfaceBorder }
            }
          }
        };

      },
      error: (error) => {
        console.error('Error al obtener las ventas por producto:', error);
      }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

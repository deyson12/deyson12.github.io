import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ViewChild } from '@angular/core';
import { OrderService } from '../../service/order.service';
import { Order } from '../../../models/order';
import { GoogleMapsModule, MapInfoWindow, MapMarker } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { Tab } from "primeng/tabs";
import { TableModule } from 'primeng/table';
import { OrderMap } from '../../../models/orderMap';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, GoogleMapsModule, TableModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {

  @ViewChild(MapInfoWindow) infoWin!: MapInfoWindow;
  selectedOrder: OrderMap | null = null;

  trackByOrderId = (_: number, o: any) => o?.order?.id;

  orders: OrderMap[] = [];

  center: google.maps.LatLngLiteral = { lat: 6.2442, lng: -75.5812 };

  constructor(private readonly orderService: OrderService) { }

  ngOnInit(): void {
    this.loadPendingOrders();
  }

  loadPendingOrders(): void {
    this.orderService.getOrders().subscribe(orders => {
      console.log(orders);
      this.orders = orders.map(order => ({
        order,
        showMap: false,
        color: this.getRandomColor()
      })) as OrderMap[];
    });
  }

  getRandomColor(): any {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  getMarkerIcon(order: OrderMap): google.maps.Symbol {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: this.getSize(order.order),                 // tamaño del círculo
      fillColor: order.color || '#1976d2',  // color del marker
      fillOpacity: 1,
      strokeColor: '#ffffff',    // borde para contraste
      strokeWeight: 2
    };
  }

  getSize(order: Order): number | null | undefined {
    if (!order) return null;
    const total = this.getTotal(order);
    if (total < 10000) return 12;
    if (total >= 10000 && total < 100000) return 14;
    if (total >= 100000 && total < 1000000) return 16;
    if (total >= 1000000) return 18;
    return 12;
  }

  onMarkerClick(order: OrderMap, marker: MapMarker) {
    this.selectedOrder = order;
    
    this.orders.forEach(o => o.showMap = false);
    order.showMap = true;

    this.center = this.getLocation(order.order.location);

    this.infoWin.open(marker);
  }

  getTotal(order: Order | undefined): number {
    if (!order) return 0;
    return order.products.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }

  getLocation(location: [number, number]): google.maps.LatLngLiteral {
    return { lat: location[0], lng: location[1] };
  }

}

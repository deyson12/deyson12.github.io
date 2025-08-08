import { Component, OnInit } from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { CoverageZonesService, ZoneResponse } from '../../service/coverage-zones.service';
import { AuthService } from '../../service/auth.service';
import { Footer, TreeNode } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TreeSelectModule } from 'primeng/treeselect';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Constants } from '../../../config/constants';
import { InputNumberModule } from 'primeng/inputnumber';

export interface PolygonData {
  paths: google.maps.LatLngLiteral[];
  options: google.maps.PolygonOptions;
}

@Component({
  selector: 'app-coverage-zones',
  imports: [
    CommonModule,
    FormsModule,
    GoogleMapsModule,
    TableModule,
    DialogModule,
    TreeSelectModule,
    ButtonModule,
    InputNumberModule
  ],
  templateUrl: './coverage-zones.component.html',
  styleUrl: './coverage-zones.component.scss'
})
export class CoverageZonesComponent implements OnInit {

  whatsAppNumber = Constants.whatsAppNumber;

  bannerVisible = true;

  center!: google.maps.LatLngLiteral;
  markerPosition!: google.maps.LatLngLiteral;

  polygons: PolygonData[] = [];
  sellerId: string;

  zoom: number = 14;

  sellerZones: any[] = [];        // Zonas ya asociadas al vendedor
  zoneTree: TreeNode[] = [];      // Árbol de zonas disponibles
  selectedZone: any;              // Nodo seleccionado en TreeSelect
  deliveryPrice: number = 0;      // Valor del domicilio
  displayAddDialog = false;       // Control del diálogo

  constructor(
    private readonly coverageZonesService: CoverageZonesService,
    private authService: AuthService

  ) {
    this.sellerId = authService.getValueFromToken('userId');
  }

  ngOnInit(): void {
    this.loadSellerZones();
    this.loadZoneTree();
  }

  loadSellerZones() {
    this.coverageZonesService.getCoverageZonesBySeller(this.sellerId).subscribe({
      next: (data) => {
        console.log('Coverage zones fetched:', data);

        this.sellerZones = data.map(zone => ({
          id: zone.id,
          name: zone.name,
          description: zone.description,
          createdAt: zone.createdAt,
          priority: zone.priority,
          deliveryPrice: zone.deliveryPrice || 0 // Asignar valor por defecto si no existe
        }));

        // Encontrar el de mayor prioridad (menor número)
        const highestPriorityZone = data.reduce((prev, current) => {
          return (prev.priority < current.priority) ? prev : current;
        }, data[0]);

        console.log('Highest priority zone:', highestPriorityZone);

        // Convertirmos el highestPriorityZone en el centro del mapa
        if (highestPriorityZone && highestPriorityZone.polygon.length > 0) {

          if (highestPriorityZone.name === 'Todo Medellín') {
            this.zoom = window.innerWidth < 768 ? 11 : 12;
          } else if (highestPriorityZone.name === 'Todo Robledo') {
            // Si es PC zoom = 14 si es celular zoom = 13
            this.zoom = window.innerWidth < 768 ? 13 : 14;
          } else {
            this.zoom = window.innerWidth < 768 ? 14 : 15;
          }

          const latSum = highestPriorityZone.polygon.reduce((sum, coord) => sum + coord.lat, 0);
          const lngSum = highestPriorityZone.polygon.reduce((sum, coord) => sum + coord.lng, 0);
          this.center = {
            lat: latSum / highestPriorityZone.polygon.length,
            lng: lngSum / highestPriorityZone.polygon.length
          };
        } else {
          this.center = { lat: 6.2442, lng: -75.5812 }; // Default center
          this.zoom = 14; // Default zoom
        }

        this.polygons = data.map(zone => ({
          paths: zone.polygon.map(coord => ({ lat: coord.lat, lng: coord.lng })),
          options: {
            fillColor: '#2196f3',
            fillOpacity: 0.4,
            strokeWeight: 0,
            clickable: false
          }
        }));

        // Set marker from localStorage 
        /*
{
    "latitude": 6.2859845,
    "longitude": -75.6109902,
    "address": "Cra. 99 # 65-265, Santa Margarita, Medellín, San Cristóbal, Medellín, Antioquia, Colombia"
}
        */
        const lat = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').latitude : 0;
        const lng = localStorage.getItem('location') ? JSON.parse(localStorage.getItem('location') || '{}').longitude : 0;
        this.markerPosition = { lat, lng };

      },
      error: (error) => {
        console.error('Error fetching coverage zones:', error);
      }
    });
  }

  loadZoneTree() {
    // Convertir lista plana a TreeNode[]
    // Ejemplo simple (sin jerarquía):

    this.coverageZonesService.getCoverageZones().subscribe((zones: ZoneResponse[]) => {
      this.zoneTree = zones.map(zone => ({
        key: zone.polygon[0].lat + ',' + zone.polygon[0].lng, // Usar coordenadas como clave
        label: zone.name,
        data: zone,
        children: [] // Si no hay hijos, dejar array vacío
      }));
    });
  }

  addZone() {
    if (this.selectedZone) {

      console.log('Selected zone:', this.selectedZone);
      // Llamada al backend para asociar la zona
      this.coverageZonesService.assignZone(this.sellerId, this.selectedZone.data.id, this.deliveryPrice).subscribe(() => {
        // Refrescar tabla
        this.loadSellerZones();
        this.displayAddDialog = false;
        this.selectedZone = null;
      });
    }
  }

  removeZone(zone: any) {
    // Llamada al backend para desasociar la zona
    this.coverageZonesService.removeZone(this.sellerId, zone.id).subscribe(() => {
      // Refrescar tabla
      this.loadSellerZones();
    });
  }

  whatsappLink(): string {
    const message = `Hola, necesito una zona de cobertura diferente!`;
    return `https://wa.me/${this.whatsAppNumber}?text=${encodeURIComponent(message)}`;
  }

  closeBanner(): void {
    this.bannerVisible = false;
  }
}

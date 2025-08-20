import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';
import { MessageModule } from 'primeng/message';
import { LogService } from '../../service/log.service';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    GoogleMapsModule,
    MessageModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './location.component.html',
})
export class LocationComponent implements OnInit {
  latitude!: number;
  longitude!: number;
  address: string = '';
  showDialog = false;
  newAddress: string = '';

  showAllowDialog = false;

  // centro del mapa y posición del marcador
  center!: google.maps.LatLngLiteral;
  markerPosition!: google.maps.LatLngLiteral;
  markerOptions: google.maps.MarkerOptions = { draggable: true };

  geoAllowLocation = false;

  private apiKey = 'AIzaSyCZDKgSFqjayBMohK8lawKi2KPf8HLWdnM';

  constructor(
    private readonly http: HttpClient,
    private readonly logService: LogService
  ) { }

  ngOnInit(): void {
    const saved = localStorage.getItem('location');
    if (saved) {
      this.geoAllowLocation = true;
      this.showAllowDialog = false;
      const loc = JSON.parse(saved);
      this.latitude = loc.latitude;
      this.longitude = loc.longitude;
      this.address = loc.address;
      this.setMapLocation(this.latitude, this.longitude);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            this.geoAllowLocation = true;
            this.showAllowDialog = false;
            this.latitude = pos.coords.latitude;
            this.longitude = pos.coords.longitude;
            this.setMapLocation(this.latitude, this.longitude);
            this.reverseGeocode(this.latitude, this.longitude);
          },
          err => {
            console.error('Error getting location:', err);
            this.geoAllowLocation = false;
            this.showAllowDialog = true;
          }
        );
      } else {
        this.geoAllowLocation = false;
        this.showAllowDialog = true;
      }
    }
  }

  assignMylocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.latitude = pos.coords.latitude;
          this.longitude = pos.coords.longitude;
          this.setMapLocation(this.latitude, this.longitude);
          this.reverseGeocode(this.latitude, this.longitude);
        },
        err => {
          console.error('Error getting location:', err);
        }
      );
    }
  }

  private setMapLocation(lat: number, lng: number) {
    this.center = { lat, lng };
    this.markerPosition = { lat, lng };
  }

  private saveLocation() {
    localStorage.setItem('location', JSON.stringify({
      latitude: this.latitude,
      longitude: this.longitude,
      address: this.address
    }));

    this.logService.log('NEW_LOCATION', {
      latitude: this.latitude,
      longitude: this.longitude,
      address: this.address
    }).subscribe();

    // refrescar la página para aplicar los cambios
    window.location.reload();
  }

  private reverseGeocode(lat: number, lng: number) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`
      + `?latlng=${lat},${lng}`
      + `&key=${this.apiKey}&language=es&region=co`;
    this.http.get<any>(url).subscribe(resp => {
      if (resp.status === 'OK') {
        this.address = resp.results[0].formatted_address;
        this.saveLocation();
      }
    });
  }

  private forwardGeocode(addr: string) {
    const q = encodeURIComponent(addr + ' Antioquia');
    const url = `https://maps.googleapis.com/maps/api/geocode/json`
      + `?address=${q}&key=${this.apiKey}&language=es&region=co`;
    this.http.get<any>(url).subscribe(resp => {
      if (resp.status === 'OK') {
        const loc = resp.results[0].geometry.location;
        this.latitude = loc.lat;
        this.longitude = loc.lng;
        this.setMapLocation(this.latitude, this.longitude);
        this.address = resp.results[0].formatted_address;
        this.saveLocation();
      }
    });
  }

  onComponentClick() {
    // si aún no tenemos coords, quizá quieras forzar la geoloc de nuevo
    if (!this.center) {
      return navigator.geolocation.getCurrentPosition(
        pos => {
          this.latitude = pos.coords.latitude;
          this.longitude = pos.coords.longitude;
          this.setMapLocation(this.latitude, this.longitude);
          this.reverseGeocode(this.latitude, this.longitude);
          this.showDialog = true;
        },
        () => { this.showDialog = true; }
      );
    }
    this.showDialog = true;
  }

  saveNewAddress() {
    if (this.newAddress.trim()) {
      this.forwardGeocode(this.newAddress.trim());
    }
  }

  // ← evento que lanza el marcador al terminar de arrastrarlo
  onMarkerDragEnd(event: google.maps.MapMouseEvent): void {
    const lat = event.latLng!.lat();
    const lng = event.latLng!.lng();
    this.latitude = lat;
    this.longitude = lng;
    this.setMapLocation(lat, lng);
    this.reverseGeocode(lat, lng);
  }

  async onAllowLocation() {

    const status = await navigator.permissions.query({ name: 'geolocation' });

    if (status.state === 'granted') {
      // Ya tenemos permiso: obtenemos posición
      this.ngOnInit();
    }
    else if (status.state === 'prompt') {
      // Aún no se le preguntó o lo canceló sin denegar: solicitamos
      this.ngOnInit();
    }
    else {
      // state === 'denied'
      // Avisar al usuario que debe activar el permiso en la configuración
      alert(
        'El permiso de ubicación está deshabilitado. ' +
        'Por favor, ve a la configuración de tu navegador y permite el acceso a la ubicación para este sitio.'
      );
    }
  }
}

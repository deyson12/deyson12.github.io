import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor() {}

  requestPermission(): Promise<void> {
    return new Promise((resolve, reject) => { 
      if (!navigator.geolocation) {
        reject('Geolocalización no está soportada por el navegador.');
      } else {
        // No hay un método directo para solicitar permiso, pero podemos intentar obtener la ubicación
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (error) => reject('Permiso denegado: ' + error.message)
        );
      }
    }
    );
  }

  getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocalización no está soportada por el navegador.');
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            reject('No se pudo obtener la ubicación: ' + error.message);
          }
        );
      }
    });
  }
}

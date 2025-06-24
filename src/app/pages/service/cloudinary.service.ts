import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

interface ImageUploadResponsse {
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  
  private readonly apiUrl = `${environment.apiUrl}/api/images/upload`;
  
  constructor(private readonly http: HttpClient) { }

  uploadImage(file: File, name: string, folder: string = 'otros'): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('folder', folder);

    return this.http
      .post<ImageUploadResponsse>(this.apiUrl, formData)
      .pipe(
        map(response => response.url)
      );
  }

}

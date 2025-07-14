import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cloudinaryPlaceholder'
})
export class CloudinaryPlaceholderPipe implements PipeTransform {
  transform(url: string): string {
    if (!url || !url.includes('cloudinary.com')) return url;
    // w_20,q_20,e_blur:2000 genera miniatura borrosa
    return url.replace(
      '/upload/',
      '/upload/w_20,q_20,e_blur:2000,f_auto/'
    );
  }
}
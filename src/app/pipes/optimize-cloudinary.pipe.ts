import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'optimizeCloudinary'
})
export class OptimizeCloudinaryPipe implements PipeTransform {
  transform(url: string): string {
    if (!url || !url.includes('cloudinary.com')) return url;

    const urlNew = url.replace(
      '/upload/',
      '/upload/f_auto,q_auto,w_auto,c_limit,dpr_auto/'
    );

    return urlNew;
  }
}

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

    if (url.includes('88a5cd6e-6420-4e23-a6ae-a0146eb3869e')) {
      console.log('Url:', url);
      console.log('Url New:', urlNew);
    }

    return urlNew;
  }
}

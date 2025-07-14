import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cloudinarySrcset'
})
export class CloudinarySrcsetPipe implements PipeTransform {
  transform(url: string, widths: string): string {
    if (!url || !url.includes('cloudinary.com')) return url;
    const [base, rest] = url.split('/upload/');
    return widths
      .split(',')
      .map(w =>
        `${base}/upload/f_auto,q_auto,w_${w},c_limit,dpr_auto/${rest} ${w}w`
      )
      .join(', ');
  }
}
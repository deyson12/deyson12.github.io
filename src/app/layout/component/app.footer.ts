import { Component } from '@angular/core';
import { Constants } from '../../config/constants';
import { environment } from '../../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer w-full
            flex flex-col items-center text-center space-y-1
            md:flex-row md:items-center md:justify-center md:space-y-0 md:space-x-2">
  <span>Copyright © Todos los derechos reservados 2025</span>
  <span class="hidden md:inline">-</span>
  <span>{{ email }}</span>
  <span class="hidden md:inline">/</span>
  <span>{{ phone }}</span>

    <div class="text-inline">
        <a [href]="hrefPrivacy" target="_blank">Política de Privacidad</a> /
        <a [href]="hrefCondition" target="_blank">Términos y Condiciones</a>
    </div>

</div>
`
})
export class AppFooter {
    email = Constants.email;
    phone = Constants.phone;
    hrefPrivacy= `${environment.frontUrl}/privacy-and-policy`;
    hrefCondition= `${environment.frontUrl}/service-condition`;
}

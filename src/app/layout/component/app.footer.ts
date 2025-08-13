import { Component } from '@angular/core';
import { Constants } from '../../config/constants';

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
</div>
`
})
export class AppFooter {
    email = Constants.email;
    phone = Constants.phone;
}

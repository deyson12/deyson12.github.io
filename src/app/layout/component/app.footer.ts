import { Component } from '@angular/core';
import { Constants } from '../../config/constants';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
       Copyright © Todos los derechos reservados 2025 - {{email}} / {{phone}}
    </div>`
})
export class AppFooter {
    email = Constants.email;
    phone = Constants.phone;
}

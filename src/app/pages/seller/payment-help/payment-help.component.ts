import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../service/auth.service';
import { InvoiceComponent } from "../../admin/invoice/invoice.component";
import { Constants } from '../../../config/constants';

@Component({
  selector: 'app-payment-help',
  imports: [InvoiceComponent],
  templateUrl: './payment-help.component.html',
  styleUrl: './payment-help.component.scss'
})
export class PaymentHelpComponent implements OnInit {

  currentPlan: string | null = null;
  whatsAppNumber = Constants.whatsAppNumber;
  
  endDate = '';
  sellerId: string;

  constructor(private readonly authService: AuthService) {
    this.sellerId = this.authService.getValueFromToken('userId');
  }

  ngOnInit(): void {
    this.currentPlan = this.authService.getValueFromToken('plan');
    this.endDate = this.authService.getValueFromToken('endDate');
  }

  whatsappLink(type: string): string {
    let message = 'Hola, deseo actualizar mi plan!';

    if (type === 'activar') {
      message = 'Hola, deseo actualizar y activar mi plan!';
    }

    return `https://wa.me/${this.whatsAppNumber}?text=${encodeURIComponent(message)}`;
  }

  futureEndDate(): boolean {
    // 1. Fecha de fin (puedes reemplazar el string por this.endDate si viene de tu componente)
    const endDate = new Date(this.endDate);

    // 2. Fecha de hoy sin hora
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. Normalizar hora de la fecha de fin a medianoche
    endDate.setHours(0, 0, 0, 0);

    // 4. Si endDate >= today devuelve true, si es menor devuelve false
    return endDate.getTime() >= today.getTime();
  }

}

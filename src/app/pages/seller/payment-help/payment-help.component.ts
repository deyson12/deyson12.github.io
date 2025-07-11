import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-payment-help',
  imports: [],
  templateUrl: './payment-help.component.html',
  styleUrl: './payment-help.component.scss'
})
export class PaymentHelpComponent implements OnInit {

  currentPlan: string | null = null;
  nextPlan = 'Adicional';        // texto para el mensaje de WhatsApp
  whatsAppNumber = '573136090247';
  qrCodeUrl = 'https://res.cloudinary.com/dsnijmtqf/image/upload/v1750429659/qr-code_adb3ed.jpg';  // ruta de la imagen QR
  bankName = 'Bancolombia';
  accountNumber = '353-860566-07';
  endDate = '';

  constructor(private readonly autService: AuthService) { }

  ngOnInit(): void {
    this.currentPlan = this.autService.getValueFromToken('plan');
    this.endDate = this.autService.getValueFromToken('endDate');
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

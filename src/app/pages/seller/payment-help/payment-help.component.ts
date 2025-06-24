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

  constructor(private autService: AuthService){}
  
  ngOnInit(): void {
      this.currentPlan = this.autService.getValueFromToken('plan');
      this.endDate = this.autService.getValueFromToken('endDate');
  }

  whatsappLink(): string {
    const message = `Hola, deseo actualizar mi plan a ${this.nextPlan}`;
    return `https://wa.me/${this.whatsAppNumber}?text=${encodeURIComponent(message)}`;
  }

}

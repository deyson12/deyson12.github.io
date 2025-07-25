import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { FormsModule } from '@angular/forms';
import { Invoice } from '../../../models/invoice';
import { InvoiceService } from '../../service/invoice.service';
import { DialogModule } from 'primeng/dialog';
import { Constants } from '../../../config/constants';
import { DatePickerModule } from 'primeng/datepicker';
import { PrimeNG } from 'primeng/config';

@Component({
  selector: 'app-invoice',
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, TagModule, DatePickerModule,
    TabsModule, FormsModule, DialogModule],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss'
})
export class InvoiceComponent implements OnInit {

  @Input() sellerId!: string;

  es: any;

  qrCodeUrl = Constants.qrCode;  // ruta de la imagen QR
  bankName = Constants.bankName;
  accountNumber = Constants.accountNumber;
  whatsAppNumber = Constants.whatsAppNumber;
  phone = Constants.phone;

  activeTab = 0;
  selectedMonth: Date;
  displayPaymentForm = false;

  pendingInvoices: Invoice[] = [];
  paidInvoices: Invoice[] = [];

  invoice?: Invoice;

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly datePipe: DatePipe,
  private primengConfig: PrimeNG
) {
    const today = new Date();
    this.selectedMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }

  ngOnInit(): void {
    this.loadInvoices();

    this.es = {
      firstDayOfWeek: 1,
      dayNames: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
      dayNamesShort: ['dom','lun','mar','mié','jue','vie','sáb'],
      dayNamesMin: ['D','L','M','X','J','V','S'],
      monthNames: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
      monthNamesShort: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
      today: 'Hoy',
      clear: 'Borrar'
    };

    this.primengConfig.setTranslation(this.es);
  }

  loadInvoices(): void {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth() + 1; // backend espera 1–12
    if (this.sellerId) {
      this.invoiceService
        .getInvoicesBySeller(year, month, this.sellerId)
        .subscribe({
          next: (list) => this.fillInvoices(list),
          error: (err) => console.error('Error cargando facturas', err)
        });
    } else {
      this.invoiceService
        .getInvoices(year, month)
        .subscribe({
          next: (list) => this.fillInvoices(list),
          error: (err) => console.error('Error cargando facturas', err)
        });
    }
  }

  fillInvoices(list: Invoice[]) {
    this.pendingInvoices =  list.filter(inv => inv.status === 'PENDING' || inv.status === 'SENT');
    this.paidInvoices = list.filter(inv => inv.status === 'PAID');

    if (this.pendingInvoices.length <= 0 && this.paidInvoices.length > 0) {
      this.activeTab = 1;
    } else {
      this.activeTab = 0;
    }

  }

  onMonthChange(date: Date) {
    this.selectedMonth = date;
    this.loadInvoices();
  }

  // Métodos de acción
  resendByEmail(invoice: Invoice) {
    // lógica para reenviar por email
  }

  markAsPaid(invoice: Invoice) {
    // lógica para marcar como pagada
  }

  viewInvoice(invoice: Invoice) {
    // lógica para ver factura
  }

  getWhatsAppLink(invoice: Invoice): string {
    // fecha en español
    const fechaEs = this.datePipe.transform(
      invoice.billingMonth,
      'MMMM yyyy',
      undefined,
      'es-CO'
    );

    // link de pago (ajusta la URL base según tu backend)
    const paymentLink = `https://ventas7lunas.shop/pago?invoiceId=${invoice.id}`;

    // mensaje con enlace de pago
    const rawMessage =
      `Hola ${invoice.sellerName},\n\n` +
      `Tienes pendiente la factura *ID: ${invoice.id}* correspondiente a *${fechaEs}*.\n\n` +
      `Para pagar, haz clic aquí:\n${paymentLink}\n\n` +
      `Por favor, realiza el pago en un plazo máximo de 10 días hábiles. ` +
      `Si no lo recibimos antes de ese plazo, tu cuenta se deshabilitará temporalmente.\n\n` +
      `Quedamos atentos a tu confirmación. ¡Saludos!`;

    const encoded = encodeURIComponent(rawMessage);
    return `https://wa.me/${this.whatsAppNumber}?text=${encoded}`;
  }

  payInvoice(invoice: Invoice) {
    this.invoice = invoice;
    this.displayPaymentForm = true;
  }

  closePaymentForm() {
    this.displayPaymentForm = false;
  }

  get whatsappHelpLink(): string {
    const msg = 
      'Hola, requiero ayuda para pagar mi factura:\n\n' +
      `• *ID*: ${this.invoice?.id}\n` +
      `• *Mes*: ${this.invoice?.billingMonth}\n` +
      `• *Total*: $ ${this.invoice?.commissionAmount}`;
    return `https://api.whatsapp.com/send?phone=${this.whatsAppNumber}&text=${encodeURIComponent(msg)}`;
  }

}

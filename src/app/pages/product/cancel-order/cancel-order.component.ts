import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { AuthService } from '../../service/auth.service';
import { CartService } from '../../service/cart.service';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TextareaModule } from 'primeng/textarea';
import { OrderService } from '../../service/order.service';

@Component({
  selector: 'app-cancel-order',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    DropdownModule,
    TextareaModule,
    AppFloatingConfigurator
  ],
  templateUrl: './cancel-order.component.html',
  styleUrl: './cancel-order.component.scss'
})
export class CancelOrderComponent implements OnInit {

  orderId: string = '';
  userId: string | null = null;

  status: string | null = null;
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  otherCause: string = '';

  causes = [
  { label: 'Cliente no disponible', value: 'Cliente no disponible' },
  { label: 'Producto agotado', value: 'Producto agotado' },
  { label: 'No hago entregas en esa zona', value: 'No hago entregas en esa zona' },
  { label: 'El cliente se retractó', value: 'El cliente se retractó' },
  { label: 'Problemas personales o de salud', value: 'Problemas personales o de salud' },
  { label: 'Otro', value: 'Otro' },
];

  selectedCause: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('uuid') ?? '';
    this.userId = this.authService.getValueFromToken('userId');
    // No cancelamos hasta que elija causa
  }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      return;
    }
    this.errorMessage = '';
    this.authService.login(this.email.trim(), this.password).subscribe({
      next: token => {
        this.authService.setToken(token);
        window.location.reload();
      },
      error: err => this.errorMessage = err.message
    });
  }

  onSubmitCause() {
    if (!this.selectedCause || !this.userId) return;
    this.status = 'PENDING';
    this.orderService.cancelOrder(this.orderId, this.userId, this.selectedCause === 'Otro' ? `Otra: ${this.otherCause} ` : this.selectedCause)
      .subscribe({
        next: resp => this.status = resp.status,
        error: ()   => this.status = 'ERR'
      });
  }
}

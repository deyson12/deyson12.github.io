import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { CartService } from '../../service/cart.service';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../service/order.service';

@Component({
  selector: 'app-confirm-order',
  imports: [
    FormsModule,
    CommonModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    AppFloatingConfigurator
  ],
  templateUrl: './confirm-order.component.html',
  styleUrl: './confirm-order.component.scss'
})
export class ConfirmOrderComponent implements OnInit {

  orderId: string = '';
  userId: string | null = null;

  status: string | null = null;

  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('uuid') ?? '';
    this.userId = this.authService.getValueFromToken('userId');

    if (this.userId) {
      this.orderService.confirmOrder(this.orderId, this.userId).subscribe({
        next: (confirmOrderResponse) => {
          this.status = confirmOrderResponse.status;
        },
        error: (error) => {
          this.status = 'ERR';
        }
      });
    }
  }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      return;
    }

    this.errorMessage = '';
    this.authService.login(this.email.trim(), this.password).subscribe({
      next: (token: string) => {
        this.authService.setToken(token);
        window.location.reload();
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
      }
    });
  }

}

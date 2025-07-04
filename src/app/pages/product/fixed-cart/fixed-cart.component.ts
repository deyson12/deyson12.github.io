import { Component } from '@angular/core';
import { CartService } from '../../service/cart.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-fixed-cart',
  imports: [CommonModule, RouterModule],
  templateUrl: './fixed-cart.component.html',
  styleUrl: './fixed-cart.component.scss'
})
export class FixedCartComponent {

  constructor(public cartService: CartService) {}

}

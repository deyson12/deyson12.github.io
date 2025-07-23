import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { CartService } from '../../service/cart.service';
import { CarouselComponent } from '../carousel/carousel.component';
import { User } from '../../../models/user';
import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { Product } from '../../../models/product';
import { ProductService } from '../../service/product.service';

@Component({
  selector: 'app-seller-profile',
  imports: [CommonModule, CardComponent, CarouselComponent],
  providers: [CartService],
  templateUrl: './seller-profile.component.html',
  styleUrl: './seller-profile.component.scss'
})
export class SellerProfileComponent implements OnInit {

  seller!: User;
  products: Product[] = [];

  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
      this.loadSeller();
      this.loadProducts();
  }

  loadSeller() {
    this.userService.getUserById(this.authService.getValueFromToken('userId')).subscribe({
      next: (response: User) => {
        this.seller = response;
      },
      error: (err: Error) => {
      }
    });
  }

  loadProducts() {
    this.productService.getProductsBySellerId(this.authService.getValueFromToken('userId')).subscribe(products => {
      this.products = products;
    });
  }

}

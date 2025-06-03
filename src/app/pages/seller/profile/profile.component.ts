import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SellerService } from '../../service/seller.service';
import { ProductService } from '../../service/product.service';
import { Seller } from '../../../models/selller';
import { Product } from '../../../models/product';
import { CardComponent } from '../../product/card/card.component';
import { CartService } from '../../service/cart.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, CardComponent, ReactiveFormsModule],
  providers: [CartService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  seller!: Seller;
  products: Product[] = [];
  productLimit = 3; // Ajusta según el plan actual
  displayPreview = false;
  selectedProduct!: Product;
  bannerVisible = true;

  constructor(
    private fb: FormBuilder,
    private sellerService: SellerService,
    private productService: ProductService
  ) { }

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      facebookUrl: [''],
      instagramUrl: [''],
      twitterUrl: [''],
      linkedinUrl: ['']
    });

    this.loadSeller();
    this.loadProducts();
  }

  loadSeller(): void {
    this.sellerService.getSeller('').subscribe(seller => {
      this.seller = seller;
      this.profileForm.patchValue({
        name: seller.name,
        description: seller.description,
        facebookUrl: seller.facebookUrl,
        instagramUrl: seller.instagramUrl,
        twitterUrl: seller.twitterUrl,
        linkedinUrl: seller.linkedinUrl
      });
    });
  }

  loadProducts(): void {
    this.productService.getProductsBySeller().subscribe(products => {
      this.products = products;
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const updatedSeller: Seller = {
      ...this.seller,
      ...this.profileForm.value
    };
    this.sellerService.updateSeller(updatedSeller).subscribe(res => {
      this.seller = res;
    });
  }

  onProfileImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.sellerService.uploadProfileImage(file).subscribe(url => {
        this.seller.profileImage = url;
      });
    }
  }

  openNewProductForm(): void {
    // Lógica para abrir formulario de nuevo producto (modal o navegación)
  }

  editProduct(product: Product): void {
    // Lógica para editar producto (modal o navegación)
  }

  deleteProduct(product: Product): void {
    this.productService.deleteProduct(product.id).subscribe(() => {
      this.loadProducts();
    });
  }

  toggleFeatured(product: Product): void {
    const updated: Product = { ...product, featured: !product.featured };
    this.productService.updateProduct(updated).subscribe(res => {
      product.featured = res.featured;
    });
  }

  previewProduct(p: Product): void {
    this.selectedProduct = p;
    this.displayPreview = true;
  }

  closePreview(): void {
    this.displayPreview = false;
  }

  closeBanner(): void {
    this.bannerVisible = false;
  }
}

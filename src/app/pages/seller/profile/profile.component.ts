import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SellerService } from '../../service/seller.service';
import { ProductService } from '../../service/product.service';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../../../models/product';
import { CardComponent } from '../../product/card/card.component';
import { CartService } from '../../service/cart.service';
import { UserService } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { User } from '../../../models/user';
import { ToastService } from '../../service/toast.service';
import { CloudinaryService } from '../../service/cloudinary.service';
import { Category } from '../../../models/category';
import { CategoryService } from '../../service/category.service';
import { ChipsModule } from 'primeng/chips';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, CardComponent, ReactiveFormsModule, FormsModule, ChipsModule],
  providers: [CartService, ToastService, UserService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  user!: User;
  products: Product[] = [];
  productLimit = 3; // Ajusta según el plan actual
  displayPreview = false;
  selectedProduct!: Product;
  bannerVisible = true;

  productForm!: FormGroup;
  displayProductDialog = false;
  isEditMode = false;
  categories: Category[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly sellerService: SellerService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly categoryService: CategoryService
  ) { }

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      businessName: ['', Validators.required],
      description: [''],
      image: [''],
      facebookUrl: [''],
      instagramUrl: [''],
      twitterUrl: [''],
      linkedinUrl: ['']
    });

    this.loadCategories();
    this.buildProductForm();

    this.loadSeller();
    this.loadProducts();

    this.productForm.get('tagsArray')!.valueChanges.subscribe((arr: string[]) => {
      this.productForm.get('tags')!.setValue(arr.join(','));
    });
  }

  private loadCategories(): void {
    // Ejemplo estático; reemplaza con tu servicio si toca
    this.categoryService.getActiveCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories;
      },
      error: err => {

      }
    });
  }

  private buildProductForm(): void {
    this.productForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      originalPrice: [0],
      featured: [false],
      image: ['', Validators.required],
      category: [null, Validators.required],
      note: ['', Validators.maxLength(50)],
      tags: [''],
      tagsArray: [[], Validators.maxLength(5)],
      stock: [null, [Validators.min(0), Validators.max(10000)]],
    });
  }

  loadSeller(): void {
    this.userService.getUserById(this.authService.getValueFromToken('userId')).subscribe({
      next: (response: User) => {
        this.user = response;
        this.profileForm.patchValue({
          name: response.name,
          description: response.description,
          businessName: response.businessName,
          image: response.image,
          facebookUrl: response.facebookUrl,
          instagramUrl: response.instagramUrl,
          twitterUrl: response.twitterUrl,
          linkedinUrl: response.linkedinUrl
        });
      },
      error: (err: Error) => {
        this.toastService.showError('Error', err.message);
      }
    });
  }

  loadProducts(): void {
    this.productService.getProductsBySellerId(this.authService.getValueFromToken('userId')).subscribe(products => {
      this.products = products;
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const updatedSeller: User = {
      ...this.profileForm.value
    };
    console.log('Updated Seller:', updatedSeller);
    this.sellerService.updateSeller(updatedSeller).subscribe(res => {
      this.user = res;
    });
  }

  onProfileImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.cloudinaryService.uploadImage(file, this.user.id, 'seller').subscribe(url => {
        this.user.image = url;
        this.profileForm.patchValue({
          image: url,
        });
      });
    }
  }

  onProductImageChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.cloudinaryService.uploadImage(file, uuidv4(), 'product').subscribe(url => {
        this.productForm.patchValue({
          image: url,
        });
      });
    }
  }

  openNewProductForm(): void {
    // Lógica para abrir formulario de nuevo producto (modal o navegación)
    this.isEditMode = false;
    this.productForm.reset({
      id: null,
      name: '',
      description: '',
      price: 0,
      originalPrice: 0,
      featured: false,
      image: ''
    });
    this.displayProductDialog = true;
  }

  editProduct(product: Product): void {
    this.isEditMode = true;
    const tagsArray = product.tags
      ? product.tags.split(',').map(tag => tag.trim())
      : [];
    this.productForm.patchValue({
      ...product,
      tagsArray
    });
    this.displayProductDialog = true;
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    const prod = this.productForm.value as Product;
    prod.seller = this.authService.getValueFromToken('userId');
    this.productService.saveOrUpdateProduct(prod).subscribe(() => {
      this.loadProducts();
      this.displayProductDialog = false;
    });
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

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SellerService } from '../../service/seller.service';
import { ProductService } from '../../service/product.service';
import { Seller } from '../../../models/selller';
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

@Component({
  selector: 'app-profile',
  imports: [CommonModule, CardComponent, ReactiveFormsModule],
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
    private fb: FormBuilder,
    private sellerService: SellerService,
    private userService: UserService,
    private authService: AuthService,
    private toastService: ToastService,
    private productService: ProductService,
    private cloudinaryService: CloudinaryService,
    private categoryService: CategoryService
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

    this.loadCategories();
    this.buildProductForm();

    this.loadSeller();
    this.loadProducts();
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
      stock: [null, Validators.min(0)]
    });
  }

  loadSeller(): void {
    /*this.sellerService.getSeller('').subscribe(seller => {
      this.seller = seller;
      this.profileForm.patchValue({
        name: seller.name,
        description: seller.description,
        facebookUrl: seller.facebookUrl,
        instagramUrl: seller.instagramUrl,
        twitterUrl: seller.twitterUrl,
        linkedinUrl: seller.linkedinUrl
      });

      this.loadProducts();
    });*/

    this.userService.getUserById(this.authService.getValueFromToken('userId')).subscribe({
      next: (response: User) => {
        this.user = response;
        this.profileForm.patchValue({
          name: response.name,
          description: '',
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
    /*if (this.profileForm.invalid) return;
    const updatedSeller: Seller = {
      ...this.seller,
      ...this.profileForm.value
    };
    this.sellerService.updateSeller(updatedSeller).subscribe(res => {
      this.seller = res;
    });*/
  }

  onProfileImageChange(event: Event): void {
    console.log('hola');
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
    // Lógica para editar producto (modal o navegación)
    this.isEditMode = true;
    this.productForm.patchValue({ ...product });
    this.displayProductDialog = true;
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;
    const prod = this.productForm.value as Product;
    if (this.isEditMode) {
      this.productService.saveOrUpdateProduct(prod).subscribe(() => {
        this.loadProducts();
        this.displayProductDialog = false;
      });
    } else {
      // añade sellerId si tu API lo requiere
      prod.seller = this.authService.getValueFromToken('userId');
      this.productService.saveOrUpdateProduct(prod).subscribe(() => {
        this.loadProducts();
        this.displayProductDialog = false;
      });
    }
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

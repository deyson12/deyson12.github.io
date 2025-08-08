import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { Constants } from '../../../config/constants';
import { ScheduleComponent } from '../schedule/schedule.component';
import { filter, map } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    SelectModule,
    CardComponent,
    ReactiveFormsModule,
    FormsModule,
    ChipsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    PaginatorModule,
    ScheduleComponent,
    InputNumberModule,
    InputGroupModule,
    InputGroupAddonModule,
    TextareaModule,
    CheckboxModule
  ],
  providers: [CartService, ToastService, UserService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  
  profileForm!: FormGroup;
  user!: User;
  products: Product[] = [];
  productLimit = 50;
  displayPreview = false;
  selectedProduct!: Product;
  bannerVisible = true;
  globalFilter: string = '';

  email: string = '';
  phone: string = '';

  productForm!: FormGroup;
  displayProductDialog = false;
  isEditMode = false;
  categories: Category[] = [];
  sellerId: string;
  role: string = '';

  featured = [
    { label: 'Si', value: 'Si' },
    { label: 'No', value: 'No' },
  ];

  statuses = [
    { label: 'Activo', value: 'Activo' },
    { label: 'Inactivo', value: 'Inactivo' },
  ];

  deliveryOptions: string[] = [
    'Inmediato',
    // Horas
    '1 Hora', '6 Horas', '12 Horas', '24 Horas',
    // Días
    '1 Día', '2 Días', '7 Días', '15 Días', '30 Días',
    // Semanas
    '1 Semana', '2 Semanas',
    // Mes
    '1 Mes'
  ];

  rememberDeliveryTime = false;

  whatsAppNumber = Constants.whatsAppNumber;

  constructor(
    private readonly fb: FormBuilder,
    private readonly sellerService: SellerService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly categoryService: CategoryService
  ) {
    this.sellerId = this.authService.getValueFromToken('userId');
    this.role = this.authService.getValueFromToken('role');

    if (this.role == 'admin') {
      this.productLimit = 1000000;
    }
  }

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

    if (this.role === 'admin') {
      this.listenDropshippingPrice();
    }

    //const limit = this.authService.getValueFromToken('planProductLimit');
    //this.productLimit = limit == 'unlimited' ? -1 : (parseInt(limit, 10) || 0);
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  limpiarGlobalFilter() {
    this.globalFilter = '';
  }

  private listenDropshippingPrice(): void {
    this.productForm.get('dropshippingPrice')!
      .valueChanges
      .pipe(
        filter(v => v != null),
        map(v => Number(v))
      )
      .subscribe(dPrice => {

        const price = Math.ceil((dPrice * 1.2) / 100) * 100;    // redondea hacia arriba al centenar
        const originalPrice = Math.ceil((dPrice * 1.3) / 100) * 100;

        const revenue = +(price - Math.ceil(dPrice / 100) * 100);
        this.productForm.patchValue({
          price,
          originalPrice,
          revenue
        }, { emitEvent: false });
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
      dropshippingPrice: [],
      dropshippingUrl: [],
      revenue: [0],
      maxDeliveryTime: ['Inmediato', Validators.required],
      rememberDeliveryTime: [false],
      customEnabled: [false],
      customOptions: this.fb.array([])
    });
  }

  loadSeller(): void {
    this.userService.getUserById(this.authService.getValueFromToken('userId')).subscribe({
      next: (response: User) => {
        this.user = response;
        this.email = response.email;
        this.phone = response.phone;
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
    this.sellerService.updateSeller(this.sellerId, updatedSeller).subscribe(res => {
      this.toastService.showInfo('Exito', 'Se actualizó la inforamción de forma exitosa.');
      this.authService.setToken(res.trim());
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
      const id = this.productForm.value.id ? this.productForm.value.id : uuidv4();
      this.cloudinaryService.uploadImage(file, id, 'product').subscribe(url => {
        this.productForm.patchValue({
          image: url,
        });
      });
    }
  }

  openNewProductForm(): void {
    // Lógica para abrir formulario de nuevo producto (modal o navegación)
    this.isEditMode = false;

    const maxDeliveryTime = localStorage.getItem('maxDeliveryTime');
    const rememberDeliveryTime = localStorage.getItem('rememberDeliveryTime');

    this.productForm.reset({
      id: uuidv4(),
      name: '',
      description: '',
      price: 0,
      originalPrice: 0,
      featured: false,
      image: '',
      tagsArray: [],
      tags: '',
      rememberDeliveryTime: rememberDeliveryTime,
      maxDeliveryTime: maxDeliveryTime,
      customEnabled: false
    });
    this.displayProductDialog = true;
  }

  editProduct(product: Product): void {
  this.isEditMode = true;

  const tagsArray = product.tags
    ? product.tags.split(',').map(tag => tag.trim())
    : [];

  console.log('Editing product:', product);

  // 1) Patchear el valor base + customEnabled
  this.productForm.patchValue({
    ...product,
    tagsArray,
    customEnabled: !!(product.customOptions && product.customOptions.length)
  });

  // 2) Limpiar el FormArray
  this.customOptions.clear();

  // 3) Volcar cada opción existente
  if (product.customOptions && product.customOptions.length) {
    product.customOptions.forEach(opt => {
      this.customOptions.push(this.fb.group({
        name:    [opt['name']],
        type:    [opt['type']],
        values:  [opt['values']],
        required:[opt['required']]
      }));
    });
  }

  this.displayProductDialog = true;
}

  saveProduct(): void {

    console.log(this.productForm.value);
    console.log(this.productForm.get('customOptions')?.value);

    if (this.productForm.invalid) return;

    const { maxDeliveryTime, rememberDeliveryTime } = this.productForm.value;
    if (rememberDeliveryTime) {
      localStorage.setItem('rememberDeliveryTime', rememberDeliveryTime);
      localStorage.setItem('maxDeliveryTime', maxDeliveryTime);
    } else {
      localStorage.removeItem('rememberDeliveryTime');
      localStorage.removeItem('maxDeliveryTime');
    }

    const prod = this.productForm.value as Product;
    prod.seller = this.authService.getValueFromToken('userId');

    console.log('Product:', prod);
    this.productService.saveOrUpdateProduct(prod).subscribe(() => {
      this.loadProducts();
      this.displayProductDialog = false;
    });
  }

  deleteProduct(product: Product): void {
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.toastService.showInfo(product.active ? 'Desactivación exitosa' : 'Activación exitosa', product.active ? "Se desactivó el producto" : "Se activó el producto");
        this.loadProducts();
      },
      error: (err: Error) => {
        this.toastService.showError('Error', err.message);
      }
    });
  }

  toggleFeatured(product: Product): void {
    const updated: Product = { ...product, featured: !product.featured };
    this.productService.updateProduct(updated).subscribe(res => {
      product.featured = res.featured;
    });
  }

  get customOptions(): FormArray {
    return this.productForm.get('customOptions') as FormArray;
  }

  addOption(): void {
    this.customOptions.push(this.fb.group({
      name: [''],
      type: ['selectable'],
      values: [''],
      required: [false]
    }));
  }

  removeOption(index: number): void {
    this.customOptions.removeAt(index);
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

  whatsappLink(): string {
    const message = `Hola, alcancé el máximo de mis productos y deseo actualizar mi plan!`;
    return `https://wa.me/${this.whatsAppNumber}?text=${encodeURIComponent(message)}`;
  }
}

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
  selector: 'app-my-products',
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
    InputNumberModule,
    InputGroupModule,
    InputGroupAddonModule,
    TextareaModule,
    CheckboxModule
  ],
  templateUrl: './my-products.component.html',
  styleUrl: './my-products.component.scss'
})
export class MyProductsComponent implements OnInit {

  whatsAppNumber = Constants.whatsAppNumber;

  globalFilter: string = '';

  bannerVisible = true;
  productLimit = 50;
  role: string = '';

  displayPreview = false;
  selectedProduct!: Product;

  productForm!: FormGroup;
  displayProductDialog = false;
  isEditMode = false;

  products: Product[] = [];
  categories: Category[] = [];

  allowedNumbers: number[] = [];

  options: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  deliveryUnits = [
    { code: 'hour', singular: 'Hora', plural: 'Horas' },
    { code: 'day', singular: 'Día', plural: 'Días' },
    { code: 'week', singular: 'Semana', plural: 'Semanas' },
    { code: 'month', singular: 'Mes', plural: 'Meses' },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly toastService: ToastService,
    private readonly fb: FormBuilder
  ) {
    this.role = this.authService.getValueFromToken('role');

    if (this.role == 'ADMIN') {
      this.productLimit = 1000000;
    }
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();

    this.buildProductForm();
    this.initDelivery();

    if (this.role === 'ADMIN') {
      this.listenDropshippingPrice();
    }

    this.productForm.get('tagsArray')!.valueChanges.subscribe((arr: string[]) => {
      this.productForm.get('tags')!.setValue(arr.join(','));
    });

  }

  loadProducts(): void {
    this.productService.getProductsBySellerId(this.authService.getValueFromToken('userId')).subscribe(products => {
      this.products = products;
    });
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

    this.prefillDeliveryFromString(maxDeliveryTime || 'Inmediato');

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

    this.prefillDeliveryFromString(product.maxDeliveryTime);

    // 2) Limpiar el FormArray
    this.customOptions.clear();

    // 3) Volcar cada opción existente
    if (product.customOptions && product.customOptions.length) {
      product.customOptions.forEach(opt => {
        this.customOptions.push(this.fb.group({
          name: [opt['name']],
          type: [opt['type']],
          values: [opt['values']],
          required: [opt['required']]
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
      deliveryImmediate: [true],
      deliveryUnit: [null],
      deliveryNumber: [null],
      rememberDeliveryTime: [false],
      customEnabled: [false],
      customOptions: this.fb.array([])
    });
  }

  private initDelivery(): void {
    const compose = () => {
      const immediate = this.productForm.get('deliveryImmediate')?.value;
      if (immediate) {
        this.productForm.get('maxDeliveryTime')?.setValue('Inmediato', { emitEvent: false });
        return;
      }
      const n = this.productForm.get('deliveryNumber')?.value;
      const code = this.productForm.get('deliveryUnit')?.value as string | null;
      const unit = this.deliveryUnits.find(u => u.code === code);
      if (!n || !unit) return;
      const label = (n === 1) ? unit.singular : unit.plural;
      this.productForm.get('maxDeliveryTime')?.setValue(`${n} ${label}`, { emitEvent: false });
    };

    this.productForm.get('deliveryImmediate')?.valueChanges.subscribe(compose);
    this.productForm.get('deliveryUnit')?.valueChanges.subscribe(compose);
    this.productForm.get('deliveryNumber')?.valueChanges.subscribe(compose);

    // Prefill desde el valor actual del form (por ejemplo, default o edición)
    this.prefillDeliveryFromString(this.productForm.get('maxDeliveryTime')?.value || 'Inmediato');
  }

  onUnitChange(): void {
    const code = this.productForm.get('deliveryUnit')?.value as string | null;
    const unit = this.deliveryUnits.find(u => u.code === code);
    this.allowedNumbers = unit ? this.options : [];
    this.productForm.get('deliveryNumber')?.setValue(null);
  }

  onImmediateToggle(): void {
    if (this.productForm.get('deliveryImmediate')?.value) {
      this.productForm.get('deliveryUnit')?.setValue(null);
      this.productForm.get('deliveryNumber')?.setValue(null);
    }
  }

  private prefillDeliveryFromString(value: string): void {
    const v = (value || '').trim();
    if (!v || v.toLowerCase() === 'inmediato') {
      this.allowedNumbers = [];
      this.productForm.patchValue({
        deliveryImmediate: true,
        deliveryUnit: null,
        deliveryNumber: null,
        maxDeliveryTime: 'Inmediato'
      }, { emitEvent: false });
      return;
    }
    const m = /^(\d+)\s+(.+)$/.exec(v);
    if (!m) return;
    const n = Number(m[1]);
    const label = m[2].toLowerCase();
    const unit = this.deliveryUnits.find(u =>
      u.singular.toLowerCase() === label || u.plural.toLowerCase() === label
    );
    if (!unit) return;
    this.allowedNumbers = this.options;
    this.productForm.patchValue({
      deliveryImmediate: false,
      deliveryUnit: unit.code,
      deliveryNumber: this.allowedNumbers.includes(n) ? n : null
    }, { emitEvent: false });
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

  closeBanner(): void {
    this.bannerVisible = false;
  }

  whatsappLink(): string {
    const message = `Hola, alcancé el máximo de mis productos y deseo actualizar mi plan!`;
    return `https://wa.me/${this.whatsAppNumber}?text=${encodeURIComponent(message)}`;
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  limpiarGlobalFilter() {
    this.globalFilter = '';
  }


  previewProduct(p: Product): void {
    this.selectedProduct = p;
    this.displayPreview = true;
  }

  closePreview(): void {
    this.displayPreview = false;
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

}

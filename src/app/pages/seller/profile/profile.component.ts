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


  email: string = '';
  phone: string = '';

  

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

  rememberDeliveryTime = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly sellerService: SellerService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService
  ) {
    this.sellerId = this.authService.getValueFromToken('userId');
    this.role = this.authService.getValueFromToken('role');
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

    this.loadSeller();

    //const limit = this.authService.getValueFromToken('planProductLimit');
    //this.productLimit = limit == 'unlimited' ? -1 : (parseInt(limit, 10) || 0);
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

  /*toggleFeatured(product: Product): void {
    const updated: Product = { ...product, featured: !product.featured };
    this.productService.updateProduct(updated).subscribe(res => {
      product.featured = res.featured;
    });
  }*/

}

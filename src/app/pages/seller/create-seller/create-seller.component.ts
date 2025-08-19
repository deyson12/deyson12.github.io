import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { InputMaskModule } from 'primeng/inputmask';
import { AuthService } from '../../service/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { SellerService } from '../../service/seller.service';
import { UserPayload } from '../../../models/selllerPayload';
import { Router, RouterModule } from '@angular/router';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastService } from '../../service/toast.service';
import { VerifyCodeResponse } from '../../../models/verifyCodeResponse';
import { CloudinaryService } from '../../service/cloudinary.service';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ResendCodeResponse } from '../../../models/resendCodeResponse';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Constants } from '../../../config/constants';
import { PlanService } from '../../service/plan.service';
import { Plan } from '../../../models/plan';
import { environment } from '../../../../environments/environment';
import { ScheduleComponent } from '../schedule/schedule.component';

@Component({
  selector: 'app-create-seller',
  imports: [
    CommonModule, 
    InputMaskModule, 
    ReactiveFormsModule, 
    RouterModule, 
    StepperModule, 
    ButtonModule, 
    FormsModule,
    CheckboxModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    ScheduleComponent
  ],
  providers: [ToastService],
  templateUrl: './create-seller.component.html',
  styleUrl: './create-seller.component.scss'
})
export class CreateSellerComponent implements OnInit, OnDestroy {

  sellerForm!: FormGroup;
  avatarUrl: string = './assets/img/avatar-default.png';
  role: string | null = null;
  isBuyer: boolean = false;
  displayTerms = false;
  tycEmail = Constants.email;
  tycPhone = Constants.phone;

  uuid: string = uuidv4();
  userId: string | null = null;
  activeStep = 1;
  completeVerification = false;

  /** Array para 6 inputs */
  public inputs = new Array(6);
  /** Arreglo que guarda cada dígito ingresado */
  public codeDigits: string[] = new Array(6).fill('');

  /** Controles de reenvío */
  public resendAttempts: number = 0;
  public maxAttempts: number = 3;
  public countdown: number = 2;   // segundos iniciales
  public showResend: boolean = false;
  private intervalId: any;
  public creationButtonDisabled = false;

  plans: Plan[] = [];

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly sellerService: SellerService,
    private readonly toastService: ToastService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly planService: PlanService
  ) {
    this.userId = this.authService.getValueFromToken('userId');
    this.role = this.authService.getValueFromToken('role');
    this.isBuyer = this.role === 'BUYER';
    this.uuid = this.userId ? this.userId : this.uuid;
  }

  ngOnInit(): void {

    if (this.role === 'SELLER') {
      if (this.authService.getValueFromToken('status') == 'PENDIENTE') {
        this.activeStep = 2;
        this.startTimer();
      } else {
        this.activeStep = 3;
      }
    }

    if (this.activeStep == 1) {
       this.planService.getPlans().subscribe(plans => {
      this.plans = plans;
    });
    }

    let image = this.authService.getValueFromToken('image');

    this.avatarUrl = this.isBuyer ? (image != '' ? image : './assets/img/avatar-default.png') : './assets/img/avatar-default.png';

    // Crear el FormGroup con validaciones
    this.sellerForm = this.fb.group(
      {
        ownerName: [this.isBuyer ? this.authService.getValueFromToken('name') : '', [Validators.required, Validators.maxLength(100)]],
        businessName: ['', [Validators.required, Validators.maxLength(100)]],
        email: [
          { value: this.isBuyer ? this.authService.getValueFromToken('sub') : '', disabled: this.isBuyer },
          [Validators.required, Validators.email]
        ],
        phone: [{ value: this.isBuyer ? this.authService.getValueFromToken('phone').replace('+57','') : '', disabled: this.isBuyer }, 
          [Validators.required, Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)]],
        password: ['', this.isBuyer ? [] : [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', this.isBuyer ? [] : [Validators.required]],
        termsAccepted: [false, Validators.requiredTrue]
      },
      {
        validators: this.isBuyer ? null : this.passwordMatchValidator
      }
    );
  }

  openTerms(event: Event) {
    event.preventDefault();
    this.displayTerms = true;
  }

  closeTerms() {
    this.displayTerms = false;
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  /** Inicializa o reinicia el contador */
  startTimer() {
    this.showResend = false;
    this.countdown = 3; // duracion en segundos
    this.clearTimer();
    this.intervalId = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearTimer();
        this.showResend = true;
      }
    }, 1000);
  }

  /** Detiene el intervalo */
  private clearTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Maneja la entrada de cada dígito */
  onInput(event: Event, idx: number) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(0, 1);
    input.value = val;
    this.codeDigits[idx] = val;

    if (val && idx < this.codeInputs.length - 1) {
      this.codeInputs.toArray()[idx + 1].nativeElement.focus();
    }
  }

  /** Permite retroceder al borrar */
  onKeyDown(event: KeyboardEvent, idx: number) {
    if (event.key === 'Backspace') {
      const currentVal = this.codeDigits[idx];
      if (!currentVal && idx > 0) {
        event.preventDefault();
        const prevInput = this.codeInputs.toArray()[idx - 1].nativeElement;
        prevInput.value = '';
        this.codeDigits[idx - 1] = '';
        prevInput.focus();
      } else {
        this.codeDigits[idx] = '';
      }
    }
  }

  /** Maneja pegado del código completo */
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const clip = event.clipboardData?.getData('text') || '';
    const digits = clip.replace(/\D/g, '').slice(0, 6).split('');

    digits.forEach((d, i) => {
      this.codeDigits[i] = d;
      const inputEl = this.codeInputs.toArray()[i].nativeElement;
      inputEl.value = d;
    });

    const nextIndex = digits.length < 6 ? digits.length : 5;
    this.codeInputs.toArray()[nextIndex].nativeElement.focus();
  }

  /** Lógica para reenviar el código */
  public resendCode() {
    if (this.resendAttempts >= this.maxAttempts) return;
    this.resendAttempts++;
    // Aquí va la llamada a tu servicio para volver a enviar el código:
    this.authService.sendVerificationCode(this.authService.getValueFromToken('userId') || this.uuid).subscribe({
      next: (response: ResendCodeResponse) => {
        if (response.status) {
          this.toastService.showInfo('Exito', 'Código verificado correctamente');
        } else {
          this.toastService.showError('Error', 'Código ingresado erroneo, por favor validar');
        }
      },
      error: (err: Error) => {
        this.toastService.showError('Error', 'Ocurrió un error al enviar email. Por favor, inténtalo de nuevo más tarde.');
      }
    })

    // Reiniciar timer solo si no se alcanzó el máximo
    if (this.resendAttempts < this.maxAttempts) {
      this.startTimer();
    } else {
      this.showResend = false;
      this.clearTimer();
    }
  }

  /** Lógica para verificar el código */
  public verifyCode() {
    const fullCode = this.codeDigits.join('');
    if (fullCode.length < 6) {
      alert('Debes ingresar los 6 dígitos del código.');
      return;
    }

    this.authService.verifyCode(this.authService.getValueFromToken('userId') || this.uuid, fullCode).subscribe({
      next: (response: VerifyCodeResponse) => {
        if (response.status) {
          this.authService.setToken(response.token);
          this.completeVerification = true;
          this.clearTimer();
          this.toastService.showInfo('Exito', 'Código verificado correctamente');
        } else {
          this.toastService.showError('Error', 'Código ingresado erroneo, por favor validar');
        }
      },
      error: (err: Error) => {
        this.toastService.showError('Error', err.message);
      }
    });
  }

  getEmail(): string {
    return this.authService.getValueFromToken('sub') || this.sellerForm.get('email')?.value;
  }

  // Getter para facilitar acceso a controles en el template
  get ownerName(): AbstractControl {
    return this.sellerForm.get('ownerName')!;
  }
  get businessName(): AbstractControl {
    return this.sellerForm.get('businessName')!;
  }
  get email(): AbstractControl {
    return this.sellerForm.get('email')!;
  }
  get phone(): AbstractControl {
    return this.sellerForm.get('phone')!;
  }
  get password(): AbstractControl {
    return this.sellerForm.get('password')!;
  }
  get confirmPassword(): AbstractControl {
    return this.sellerForm.get('confirmPassword')!;
  }

  // Validador personalizado para que password y confirmPassword coincidan
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (pass && confirm && pass !== confirm) {
      return { passwordsMismatch: true };
    }
    return null;
  }

  // Método que se llama cuando el usuario selecciona una imagen
  uploadSellerImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];

    // Aquí debes implementar tu lógica real de subida a Cloudinary.
    // Por ejemplo, usando un servicio que retorne la URL. A modo de ejemplo:
    this.cloudinaryService.uploadImage(file, this.uuid, 'seller').subscribe(url => {
      this.avatarUrl = url;
    });
  }

  // Método que se invoca al enviar el formulario
  onSubmit(activateCallback: (step: number) => void): void {
    if (this.sellerForm.invalid) {
      this.sellerForm.markAllAsTouched();
      return;
    }
    this.creationButtonDisabled = true;
    this.startTimer();
    this.callCreateSeller(activateCallback);
  }

  // Aquí se construye el payload y se invoca el servicio
  private callCreateSeller(activateCallback: (step: number) => void): void {
    const raw = this.sellerForm.getRawValue();

    const payload: UserPayload = {
      userId: this.uuid,
      name: raw.ownerName,
      businessName: raw.businessName,
      image: this.avatarUrl,
      email: raw.email,
      phone: raw.phone,
      password: raw.password,
      exist: this.isBuyer,
      frontUrl: environment.frontUrl,
      backUrl: environment.apiUrl
    };

    this.sellerService.createSeller(payload).subscribe({
      next: (token) => {
        this.authService.setToken(token);
        this.sellerForm.reset();
        this.avatarUrl = './assets/img/avatar-default.png';
        if (this.isBuyer) {
          this.sellerForm.get('email')?.disable();
        }
        activateCallback(2);
      },
      error: (err) => {
        this.toastService.showError('Error', err.message);
        this.creationButtonDisabled = false;
      }
    });
  }

  completeSellerCreation() {
    localStorage.setItem('coveragePending', 'SI');
    localStorage.setItem('productsPending', 'SI');
    window.location.reload();
  }
}

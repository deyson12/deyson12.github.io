import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, NgForm, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AppFloatingConfigurator } from '../../../../layout/component/app.floatingconfigurator';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../service/auth.service';
import { ToastService } from '../../../service/toast.service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    ProgressSpinnerModule,
    AppFloatingConfigurator
  ],
  providers: [ToastService],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // UI state (Angular signals)
  loading = signal(true);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  submitError = signal<string | null>(null);

  token = '';
  emailFromServer = '';

  // Reactive form
  form: FormGroup = this.fb.group({
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]], // solo lectura
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required]]
  }, { validators: this.matchPasswordsValidator });

  // Validador personalizado: password === confirm
  // (comentarios en español)
  matchPasswordsValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const conf = group.get('confirm')?.value;
    if (!pass || !conf) return null;
    return pass === conf ? null : { mismatch: true };
  }

  constructor(
    private readonly authService: AuthService) {

  }

  ngOnInit(): void {

console.log('Entro');

    // 1) Leer token de query param
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.loading.set(false);
      this.errorMessage.set('No se encontró el token en el enlace.');
      return;
    }

    // 2) Validar token en backend
    //    Ajusta la URL según tu API (ej: /api/auth/forgot/validate)
    this.authService.validateResetPassword(this.token).subscribe({
        next: (resp) => {
          // Puede venir email o emailMasked, usa el que tengas
          const email = resp.email ?? '';
          if (!email) {
            this.errorMessage.set('Token válido pero no se pudo obtener el email.');
          } else {
            this.emailFromServer = email;
            this.form.patchValue({ email });
          }
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          // Si el backend retorna 400 → token inválido/expirado
          if (err.status === 400) {
            this.errorMessage.set('El enlace de recuperación es inválido o ha expirado.');
          } else {
            this.errorMessage.set('Ocurrió un error al validar el enlace. Inténtalo de nuevo.');
          }
        }
      });
  }

  onSubmit(): void {
    this.submitError.set(null);

    // Forzar validación de mismatch en confirm
    const mismatch = this.form.errors?.['mismatch'];
    if (mismatch) {
      this.form.get('confirm')?.setErrors({ mismatch: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const newPassword = this.form.getRawValue().password as string;

    // 3) Llamar al endpoint de cambio (ajusta a tu ruta real)
    this.authService.resetPassword(this.token, newPassword)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          // Opcional: redirigir al login con mensaje

          this.toastService.showInfo('Exito','Se restableció la contraseña correctamente');

          this.router.navigateByUrl('/auth/login?reset=success');
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 400) {
            this.submitError.set('El enlace ya fue usado o es inválido.');
          } else {
            this.submitError.set('No se pudo cambiar la contraseña. Inténtalo nuevamente.');
          }
        }
      });
  }
}

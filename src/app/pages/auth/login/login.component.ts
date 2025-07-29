import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { AuthService } from '../../service/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule, 
        CheckboxModule, 
        InputTextModule, 
        PasswordModule, 
        FormsModule, 
        RouterModule, 
        RippleModule, 
        AppFloatingConfigurator
    ],
    templateUrl: './login.component.html'
})
export class LoginComponent {
    email: string = '';
    password: string = '';
    checked: boolean = false;
    errorMessage: string = '';
    returnUrl: string | null = null;

    constructor(
        private readonly authService: AuthService,
        private readonly router: Router
    ){
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      this.returnUrl = returnUrl ? decodeURIComponent(returnUrl) : null;
    }

    onSubmit(form: NgForm) {
    if (form.invalid) {
      return;
    }

    this.errorMessage = '';
    this.authService.login(this.email.trim(), this.password).subscribe({
      next: (token: string) => {
        this.authService.setToken(token);

        if (this.returnUrl) {
          // If returnUrl is defined, navigate to that URL
          this.router.navigateByUrl(this.returnUrl);
        } else {
          // Otherwise, navigate to the default page
          this.router.navigate(['/pages/all']);
        }
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
      }
    });
  }
}

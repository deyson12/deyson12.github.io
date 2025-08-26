import { Routes } from '@angular/router';
import { Access } from './access';
import { LoginComponent } from './login/login.component';
import { Error } from './error';
import { ConfirmOrderComponent } from '../product/confirm-order/confirm-order.component';
import { CancelOrderComponent } from '../product/cancel-order/cancel-order.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password/forgot-password.component';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: LoginComponent },
    { path: 'confirm/:uuid', component: ConfirmOrderComponent },
    { path: 'cancel/:uuid', component: CancelOrderComponent },
    { path: 'forgot', component: ForgotPasswordComponent}
] as Routes;

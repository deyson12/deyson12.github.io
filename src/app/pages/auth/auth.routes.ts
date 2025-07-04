import { Routes } from '@angular/router';
import { Access } from './access';
import { LoginComponent } from './login/login.component';
import { Error } from './error';
import { ConfirmOrderComponent } from '../product/confirm-order/confirm-order.component';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: LoginComponent },
    { path: 'confirm/:uuid', component: ConfirmOrderComponent}
] as Routes;

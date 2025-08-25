import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/layout/app.layout.component';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { PrivacyAndPolicyComponent } from './app/pages/legal/privacy-and-policy/privacy-and-policy.component';
import { ServiceConditionComponent } from './app/pages/legal/service-condition/service-condition.component';

export const appRoutes: Routes = [
    {
        path: 'pages',
        component: AppLayout,
        children: [
            { path: '', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'privacy-and-policy', component: PrivacyAndPolicyComponent },
    { path: 'service-condition', component: ServiceConditionComponent },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/pages/all' }
];

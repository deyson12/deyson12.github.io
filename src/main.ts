import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';
import { DatePipe, registerLocaleData } from '@angular/common';

import localeEsCo from '@angular/common/locales/es-CO';  
import { LOCALE_ID, DEFAULT_CURRENCY_CODE } from '@angular/core';
import { TokenExpiredInterceptor } from './app/interceptors/token-expired.interceptor';

registerLocaleData(localeEsCo, 'es-CO');

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    DatePipe,
    { provide: LOCALE_ID,     useValue: 'es-CO' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'COP' },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenExpiredInterceptor,
      multi: true
    }
  ]
}).catch((err) => console.error(err));

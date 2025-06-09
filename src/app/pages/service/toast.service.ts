import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class ToastService {

  constructor(private readonly messageService: MessageService
  ) { }

  showInfo(title: string, detail: string) {
    this.messageService.add({
        severity: 'success',           // 'success' | 'info' | 'warn' | 'error'
        summary: title,            // título breve
        detail: detail,  // mensaje detallado
        life: 3000                     // opcional: duración en ms
      });
  }

  showError(title: string, detail: string) {
    this.messageService.add({
        severity: 'error',           // 'success' | 'info' | 'warn' | 'error'
        summary: title,            // título breve
        detail: detail,  // mensaje detallado
        life: 3000                     // opcional: duración en ms
      });
  }
}

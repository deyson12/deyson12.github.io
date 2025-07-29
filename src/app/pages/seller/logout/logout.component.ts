import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent {

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.logout();
  }
}

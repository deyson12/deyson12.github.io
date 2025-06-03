import { Component, computed, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../../service/layout.service';
import { AppConfigurator } from '../app.configurator';
import { AuthService } from '../../../pages/service/auth.service';

@Component({
    selector: 'app-topbar',
    imports: [RouterModule, 
        CommonModule, 
        StyleClassModule, 
        AppConfigurator
    ],
    templateUrl: './app.topbar.component.html',
})
export class AppTopbarComponent implements OnInit {

    role: 'buyer' | 'seller' | null = null;

    items!: MenuItem[];

    constructor(
        public layoutService: LayoutService,
        private auth: AuthService
    ) {}

    ngOnInit(): void {
        this.role = this.auth.getRole();
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);
}

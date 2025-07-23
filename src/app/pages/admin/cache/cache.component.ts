import { Component, OnInit } from '@angular/core';
import { CacheService } from '../../service/cache.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-cache',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './cache.component.html',
  styleUrl: './cache.component.scss'
})
export class CacheComponent implements OnInit {
  cacheNames: { label: string; value: string }[] = [];
  selectedCache: string | null = null;
  entries: Array<{ key: string; id: string; name: string }> = [];
  filterKey = '';

  constructor(private cacheSvc: CacheService) {}

  ngOnInit() {
    this.cacheSvc.getCacheNames().subscribe(list =>
      this.cacheNames = list.map(c => ({ label: c, value: c }))
    );
  }

  // Carga todas las entries del cache seleccionado
  loadEntries() {
    if (!this.selectedCache) { this.entries = []; return; }
    this.cacheSvc.getEntries(this.selectedCache).subscribe(obj => {
      this.entries = [];
      Object.entries(obj).forEach(([key, items]) => {
        items.forEach(item =>
          this.entries.push({ key, id: item.id, name: item.name })
        );
      });
    });
  }

  // Filtrar por key concreta
  searchByKey() {
    if (!this.selectedCache || !this.filterKey) {
      this.loadEntries();
      return;
    }
    this.cacheSvc
      .getEntriesByKey(this.selectedCache, this.filterKey)
      .subscribe(items => {
        this.entries = items.map(item => ({
          key: this.filterKey,
          id: item.id,
          name: item.name
        }));
      });
  }

  // Eliminar una sola entrada (key)
  clearEntry(key: string) {
    if (!this.selectedCache) return;
    this.cacheSvc.clearEntry(this.selectedCache, key).subscribe(() =>
      this.loadEntries()
    );
  }

  // Eliminar todas las entries de este cache
  clearCache() {
    if (!this.selectedCache) return;
    this.cacheSvc.clearCache(this.selectedCache).subscribe(() => {
      this.selectedCache = null;
      this.entries = [];
      // refrescar lista de caches
      this.ngOnInit();
    });
  }

  // Eliminar TODOS los caches
  clearAll() {
    this.cacheSvc.clearAll().subscribe(() => {
      this.selectedCache = null;
      this.entries = [];
      this.cacheNames = [];
      // refrescar lista de caches
      this.ngOnInit();
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { ProductService } from '../../service/product.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Product } from '../../../models/product';
import { map, filter, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-all-filtered',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './all-filtered.component.html',
  styleUrls: ['./all-filtered.component.scss']
})
export class AllFilteredComponent implements OnInit {
  q = '';
  products: Product[] = [];

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params: ParamMap) => params.get('q') ?? ''), // extrae el q
      filter(q => q.length > 0),                        // opcional: sólo si no está vacío
      distinctUntilChanged(),                           // evita repeticiones
      switchMap(q => {
        this.q = q;                                     // guarda localmente
        return this.productService.getAllProductsByQuery(q);
      })
    ).subscribe({
      next: products => this.products = products || [],
      error: _      => this.products = []
    });
  }
}

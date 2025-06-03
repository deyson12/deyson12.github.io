import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Item } from '../../../models/item';
import { DragScrollDirective } from '../../../directives/drag-scroll.directive';

@Component({
  selector: 'app-slider',
  imports: [CommonModule, DragScrollDirective],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss'
})
export class SliderComponent {
  
  @Input() itemsMenu: Item[] = [];
  
  onClick(item: Item) {
    throw alert(item.label);
  }

}

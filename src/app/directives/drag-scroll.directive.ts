import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appDragScroll]',
  standalone: true
})
export class DragScrollDirective {
  private isDown = false;
  private startX = 0;
  private scrollLeftStart = 0;
  private rafId!: number; 

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(evt: MouseEvent) {
    this.isDown = true;
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grabbing');
    this.startX = evt.pageX - this.el.nativeElement.offsetLeft;
    this.scrollLeftStart = this.el.nativeElement.scrollLeft;
    evt.preventDefault();
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  onMouseUp() {
    this.isDown = false;
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
    cancelAnimationFrame(this.rafId);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(evt: MouseEvent) {
    if (!this.isDown) return;

    const x = evt.pageX - this.el.nativeElement.offsetLeft;
    // Sensibilidad 1:1
    const walk = x - this.startX;

    // Desplazamos en el próximo frame
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.el.nativeElement.scrollLeft = this.scrollLeftStart - walk;
    });

    evt.preventDefault();
  }

  @HostListener('wheel', ['$event'])
  onWheel(evt: WheelEvent) {
    // Scroll horizontal suave con la rueda
    evt.preventDefault();
    this.el.nativeElement.scrollBy({ left: evt.deltaY, behavior: 'smooth' });
  }
}
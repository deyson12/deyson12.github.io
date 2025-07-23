import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropshippingComponent } from './dropshipping.component';

describe('DropshippingComponent', () => {
  let component: DropshippingComponent;
  let fixture: ComponentFixture<DropshippingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropshippingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropshippingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

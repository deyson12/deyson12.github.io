import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentHelpComponent } from './payment-help.component';

describe('PaymentHelpComponent', () => {
  let component: PaymentHelpComponent;
  let fixture: ComponentFixture<PaymentHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

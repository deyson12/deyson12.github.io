import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceConditionComponent } from './service-condition.component';

describe('ServiceConditionComponent', () => {
  let component: ServiceConditionComponent;
  let fixture: ComponentFixture<ServiceConditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceConditionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceConditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

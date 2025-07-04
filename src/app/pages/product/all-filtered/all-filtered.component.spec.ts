import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllFilteredComponent } from './all-filtered.component';

describe('AllFilteredComponent', () => {
  let component: AllFilteredComponent;
  let fixture: ComponentFixture<AllFilteredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllFilteredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllFilteredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

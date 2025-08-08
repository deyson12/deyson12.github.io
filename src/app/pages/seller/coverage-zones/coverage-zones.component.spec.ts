import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverageZonesComponent } from './coverage-zones.component';

describe('CoverageZonesComponent', () => {
  let component: CoverageZonesComponent;
  let fixture: ComponentFixture<CoverageZonesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverageZonesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoverageZonesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

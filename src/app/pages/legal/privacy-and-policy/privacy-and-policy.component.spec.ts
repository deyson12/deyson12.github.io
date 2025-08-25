import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivacyAndPolicyComponent } from './privacy-and-policy.component';

describe('PrivacyAndPolicyComponent', () => {
  let component: PrivacyAndPolicyComponent;
  let fixture: ComponentFixture<PrivacyAndPolicyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyAndPolicyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrivacyAndPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

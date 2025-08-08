import { TestBed } from '@angular/core/testing';

import { CoverageZonesService } from './coverage-zones.service';

describe('CoverageZonesService', () => {
  let service: CoverageZonesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoverageZonesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

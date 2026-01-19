import { TestBed } from '@angular/core/testing';

import { CouponsMockService } from './coupons-mock.service';

describe('CouponsMockService', () => {
  let service: CouponsMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CouponsMockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

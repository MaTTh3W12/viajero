import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { HomeComponent } from './home.component';
import { AuthService } from '../../../service/auth.service';
import { CouponService } from '../../../service/coupon.service';
import { Router } from '@angular/router';
import { UserProfileService } from '../../../service/user-profile.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    const authMock = {
      token: 'mock-token',
      user: { email: 'empresa.demo@correo.com' },
      getCurrentUser: () => ({ companyName: 'Empresa Demo', username: 'demo' }),
      getKeycloakUser: () => null,
      user$: new BehaviorSubject({ companyName: 'Empresa Demo', username: 'demo' })
    } as Partial<AuthService>;

    const couponServiceMock = {
      getCompanyCouponStats: () => of(null),
      getMonthlyRedemptionPerformance: () => of([]),
      getCompanyTopRedeemedCoupons: () => of([]),
      getCoupons: () => of({ rows: [], total: 0 }),
      getCouponsAcquired: () => of({ rows: [], total: 0 }),
      getCouponsByIds: () => of([]),
      getAuditLogsDynamic: () => of({ rows: [], total: 0 })
    } as Partial<CouponService>;

    const routerMock = {
      navigate: jasmine.createSpy('navigate')
    } as Partial<Router>;

    const userProfileServiceMock = {
      getCurrentUserProfile: () => of(null)
    } as Partial<UserProfileService>;

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: CouponService, useValue: couponServiceMock },
        { provide: UserProfileService, useValue: userProfileServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CouponsListComponent } from './coupons-list.component';

describe('CouponsListComponent', () => {
  let component: CouponsListComponent;
  let fixture: ComponentFixture<CouponsListComponent>;
  let couponServiceSpy: jasmine.SpyObj<any>;
  let authServiceSpy: jasmine.SpyObj<any>;

  beforeEach(async () => {
    couponServiceSpy = jasmine.createSpyObj('CouponService', [
      'getCoupons',
      'getCouponImage',
      'insertCoupon',
      'updateCoupon',
      'deleteCoupon',
      'getCouponOwner',
    ]);
    couponServiceSpy.getCoupons.and.returnValue(
      of({ rows: [], total: 0 })
    );
    couponServiceSpy.getCouponImage.and.returnValue(of(null));

    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isKeycloakLoggedIn',
      'getRole',
      'getKeycloakUser',
    ]);
    authServiceSpy.isKeycloakLoggedIn.and.returnValue(true);
    authServiceSpy.getRole.and.returnValue('empresa');
    authServiceSpy.user = { email: 'test@example.com', companyName: '', username: '' };
    authServiceSpy.getKeycloakUser.and.returnValue({ email: 'test@example.com' });
    Object.defineProperty(authServiceSpy, 'token', { get: () => 'fake-token' });

    await TestBed.configureTestingModule({
      imports: [CouponsListComponent],
      providers: [
        { provide: CouponService, useValue: couponServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        // stub required services with minimal methods
        { provide: UserProfileService, useValue: { getCurrentUserProfile: () => of({ id: 123 }) } },
        { provide: CategoryService, useValue: { getCategories: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CouponsListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('fetches coupon images when initialized for empresa user', async () => {
    // ngOnInit is called automatically by Angular during fixture creation
    expect(couponServiceSpy.getCoupons).toHaveBeenCalled();
    // after coupons are set (empty by spy) we still call loadImagesForCoupons
    expect(couponServiceSpy.getCouponImage).toHaveBeenCalledTimes(0);
    // loadCompanyCouponsFromApi is async - simulate non-empty list
    couponServiceSpy.getCoupons.and.returnValue(
      of({ rows: [{ id: 1, user_id: 123, category_id: 1, auto_published: false, published: false, title: '', end_date: '', start_date: '', stock_available: 0, stock_total: 0, price: null, price_discount: null, description: null, terms: null, created_at: '', updated_at: '' }], total: 1 })
    );

    await component.loadCompanyCouponsFromApi();
    expect(couponServiceSpy.getCouponImage).toHaveBeenCalledWith('fake-token', 1);
  });
});

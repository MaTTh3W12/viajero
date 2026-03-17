import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HistorialCanjesComponent } from './historial-canjes.component';
import { AuthService } from '../../../service/auth.service';
import { CouponService } from '../../../service/coupon.service';

describe('HistorialCanjesComponent', () => {
  let component: HistorialCanjesComponent;
  let fixture: ComponentFixture<HistorialCanjesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialCanjesComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getRole: () => 'admin',
            token: 'fake-token',
          },
        },
        {
          provide: CouponService,
          useValue: {
            getCouponsAcquired: () => of({ rows: [], total: 0 }),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialCanjesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

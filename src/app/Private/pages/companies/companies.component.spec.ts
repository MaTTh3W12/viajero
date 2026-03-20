import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../service/auth.service';
import { CategoryService } from '../../../service/category.service';
import { UserProfileService } from '../../../service/user-profile.service';

import { CompaniesComponent } from './companies.component';

describe('CompaniesComponent', () => {
  let component: CompaniesComponent;
  let fixture: ComponentFixture<CompaniesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompaniesComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            token: null,
            token$: of(null),
            getRole: () => 'admin',
          },
        },
        {
          provide: UserProfileService,
          useValue: {
            getCompaniesPaged: () => of({ rows: [], total: 0 }),
          },
        },
        {
          provide: CategoryService,
          useValue: {
            getCategories: () => of([]),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

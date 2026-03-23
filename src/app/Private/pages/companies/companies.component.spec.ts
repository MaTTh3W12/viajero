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

  it('should truncate long company names in the table config', () => {
    const companyName = 'Nombre comercial con n de la empresa empresa empresa';
    const companyColumn = component.tableConfig.columns.find((column) => column.key === 'empresa');

    expect(companyColumn?.render?.(companyName, {} as never)).toBe('Nombre comercial con n de...');
  });

  it('should expose the full company name as tooltip only when truncated', () => {
    const companyName = 'Nombre comercial con n de la empresa empresa empresa';
    const companyColumn = component.tableConfig.columns.find((column) => column.key === 'empresa');

    expect(companyColumn?.tooltip?.(companyName, {} as never)).toBe(companyName);
    expect(companyColumn?.tooltip?.('Tu Empresa', {} as never)).toBeNull();
  });
});

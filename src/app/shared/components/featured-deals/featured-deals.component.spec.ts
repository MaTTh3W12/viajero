import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturedDealsComponent } from './featured-deals.component';

describe('FeaturedDealsComponent', () => {
  let component: FeaturedDealsComponent;
  let fixture: ComponentFixture<FeaturedDealsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FeaturedDealsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FeaturedDealsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

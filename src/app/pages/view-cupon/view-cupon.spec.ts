import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCupon } from './view-cupon';

describe('ViewCupon', () => {
  let component: ViewCupon;
  let fixture: ComponentFixture<ViewCupon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCupon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewCupon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

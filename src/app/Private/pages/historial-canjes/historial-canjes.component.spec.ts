import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialCanjesComponent } from './historial-canjes.component';

describe('HistorialCanjesComponent', () => {
  let component: HistorialCanjesComponent;
  let fixture: ComponentFixture<HistorialCanjesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialCanjesComponent]
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

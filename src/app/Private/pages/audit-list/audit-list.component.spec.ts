import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditListComponent } from './audit-list.component';

describe('AuditListComponent', () => {
  let component: AuditListComponent;
  let fixture: ComponentFixture<AuditListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

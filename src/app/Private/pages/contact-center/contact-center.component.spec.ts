import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactCenterComponent } from './contact-center.component';

describe('ContactCenterComponent', () => {
  let component: ContactCenterComponent;
  let fixture: ComponentFixture<ContactCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactCenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactCenterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

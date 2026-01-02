import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatedPagesComponent } from './related-pages.component';

describe('RelatedPagesComponent', () => {
  let component: RelatedPagesComponent;
  let fixture: ComponentFixture<RelatedPagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RelatedPagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RelatedPagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

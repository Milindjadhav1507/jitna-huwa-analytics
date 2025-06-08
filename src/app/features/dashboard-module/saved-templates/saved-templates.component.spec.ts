import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedTemplatesComponent } from './saved-templates.component';

describe('SavedTemplatesComponent', () => {
  let component: SavedTemplatesComponent;
  let fixture: ComponentFixture<SavedTemplatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedTemplatesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedTemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

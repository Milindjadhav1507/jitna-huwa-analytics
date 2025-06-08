import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateViewerComponent } from './template-viewer.component';

describe('TemplateViewerComponent', () => {
  let component: TemplateViewerComponent;
  let fixture: ComponentFixture<TemplateViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplateViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

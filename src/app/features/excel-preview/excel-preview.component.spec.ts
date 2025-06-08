import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelPreviewComponent } from './excel-preview.component';

describe('ExcelPreviewComponent', () => {
  let component: ExcelPreviewComponent;
  let fixture: ComponentFixture<ExcelPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcelPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExcelPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

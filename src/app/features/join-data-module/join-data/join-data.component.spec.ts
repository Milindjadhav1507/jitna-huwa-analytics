import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinDataComponent } from './join-data.component';

describe('JoinDataComponent', () => {
  let component: JoinDataComponent;
  let fixture: ComponentFixture<JoinDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

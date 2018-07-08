import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletActionsComponent } from './wallet-actions.component';

describe('WalletActionsComponent', () => {
  let component: WalletActionsComponent;
  let fixture: ComponentFixture<WalletActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WalletActionsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WalletActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

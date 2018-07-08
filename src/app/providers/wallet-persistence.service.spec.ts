import { TestBed, inject } from '@angular/core/testing';

import { WalletPersistenceService } from './wallet-persistence.service';

describe('WalletPersistenceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WalletPersistenceService],
    });
  });

  it('should be created', inject([WalletPersistenceService], (service: WalletPersistenceService) => {
    expect(service).toBeTruthy();
  }));
});

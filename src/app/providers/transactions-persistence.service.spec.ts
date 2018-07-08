import { TestBed, inject } from '@angular/core/testing';

import { TransactionsPersistenceService } from './transactions-persistence.service';

describe('TransactionsPersistenceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransactionsPersistenceService],
    });
  });

  it('should be created', inject([TransactionsPersistenceService], (service: TransactionsPersistenceService) => {
    expect(service).toBeTruthy();
  }));
});

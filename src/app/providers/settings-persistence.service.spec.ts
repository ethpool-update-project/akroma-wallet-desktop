import { TestBed, inject } from '@angular/core/testing';

import { SettingsPersistenceService } from './settings-persistence.service';

describe('SettingsPersistenceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SettingsPersistenceService],
    });
  });

  it('should be created', inject([SettingsPersistenceService], (service: SettingsPersistenceService) => {
    expect(service).toBeTruthy();
  }));
});

import { TestBed, inject } from '@angular/core/testing';

import { AkromaClientService } from './akroma-client.service';

describe('AkromaClientService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AkromaClientService],
    });
  });

  it('should be created', inject([AkromaClientService], (service: AkromaClientService) => {
    expect(service).toBeTruthy();
  }));
});

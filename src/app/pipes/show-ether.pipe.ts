import { Pipe, PipeTransform } from '@angular/core';

import { Web3Service } from '../providers/web3.service';

@Pipe({
  name: 'showEther',
})
export class ShowEtherPipe implements PipeTransform {

  constructor(private web3: Web3Service) { }

  transform(value: any, args?: any): any {
    if (value) {
      return this.web3.utils.fromWei(value.toString(), 'ether');
    }
    return null;
  }
}

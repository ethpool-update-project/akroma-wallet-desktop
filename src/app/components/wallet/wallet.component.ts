import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';

import { Wallet } from '../../models/wallet';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wallet',
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss'],
})
export class WalletComponent implements OnInit {
  @Input() wallet: Wallet;

  constructor() { }

  ngOnInit() {
  }

}

import { Component, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';

import { Transaction } from '../../models/transaction';
import { Wallet } from '../../models/wallet';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss'],
})
export class TransactionListComponent implements OnChanges, OnInit {
  @Input() lastBlockNumberSynced: number;
  @Input() endBlockNumber: number;
  @Input() transactions: Transaction[];
  @Input() wallet: Wallet;

  filteredTransactions: Transaction[];
  filter: string;
  timestamp: string = new Date().toLocaleDateString();
  page: number;

  constructor() {
    this.page = 1;
    this.filter = 'all';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!!changes.transactions && changes.transactions.currentValue !== changes.transactions.previousValue) {
      this.filteredTransactions = [ ...this.transactions ];
      this.filteredTransactions.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
    }
  }

  ngOnInit() {
  }

  setFilter(filterType: string) {
    switch (filterType) {
      case 'sent':
        this.filter = filterType;
        this.filteredTransactions = [ ...this.transactions ]
          .filter(x => x.from.toUpperCase() === this.wallet.address.toUpperCase());
        break;
      case 'received':
        this.filter = filterType;
        this.filteredTransactions = [ ...this.transactions ]
          .filter(x => x.to.toUpperCase() === this.wallet.address.toUpperCase());
        break;
      default:
        this.filter = 'all';
        this.filteredTransactions = [ ...this.transactions ];
    }
    this.filteredTransactions = [ ...this.filteredTransactions ].sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
  }

}

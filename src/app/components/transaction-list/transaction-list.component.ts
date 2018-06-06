import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

import { Transaction } from '../../models/transaction';
import { Wallet } from '../../models/wallet';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent implements OnChanges, OnInit {
  filteredTransactions: Transaction[];
  @Input() transactions: Transaction[];
  @Input() wallet: Wallet;

  timestamp: string = new Date().toLocaleDateString();
  p: number;
  filter: string;

  constructor() {
    this.p = 1;
    this.filter = 'all';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!!changes.transactions && !!changes.transactions.currentValue) {
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
        this.filteredTransactions.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
        break;
      case 'received':
        this.filter = filterType;
        this.filteredTransactions = [ ...this.transactions ]
          .filter(x => x.to.toUpperCase() === this.wallet.address.toUpperCase());
        this.filteredTransactions.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
        break;
      default:
        this.filter = 'all';
        this.filteredTransactions = [ ...this.transactions ];
        this.filteredTransactions.sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
    }
  }

}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Transaction } from '../../models/transaction';
import { Wallet } from '../../models/wallet';
import { TransactionsService } from '../../providers/transactions.service';
import { TransactionsPersistenceService } from '../../providers/transactions-persistence.service';
import { clientConstants } from '../../providers/akroma-client.constants';
import { AkromaLoggerService } from '../../providers/akroma-logger.service';

@Component({
  selector: 'app-wallet-detail-page',
  templateUrl: './wallet-detail-page.component.html',
  styleUrls: ['./wallet-detail-page.component.scss'],
})
export class WalletDetailPageComponent implements OnDestroy, OnInit {
  destroyed: boolean;
  endBlockNumber: number;
  lastBlockNumberSynced: number;
  transactions: Transaction[];
  transactionSyncInterval: any;
  pendingTransactions: Transaction[];
  syncing: boolean;
  wallet: Wallet;

  constructor(private logger: AkromaLoggerService,
              private transactionsService: TransactionsService,
              private transactionsPersistenceService: TransactionsPersistenceService,
              private route: ActivatedRoute) {
    this.transactionsService.setProvider(new this.transactionsService.providers.HttpProvider(clientConstants.connection.default));
    this.destroyed = false;
    this.syncing = false;
  }

  async ngOnInit() {
    const address = this.route.snapshot.params.address;
    const walletBalance = await this.transactionsService.eth.getBalance(address);
    this.wallet = {
      address: address,
      balance: this.transactionsService.utils.fromWei(walletBalance, 'ether'),
    };
    await this.refreshTransactions();
    this.lastBlockNumberSynced = this.getLastBlockSynced();
    this.syncTransactions(this.lastBlockNumberSynced);

    this.transactionSyncInterval = setInterval(async () => {
      if (this.syncing) {
        return;
      }
      await this.refreshTransactions();
      this.lastBlockNumberSynced = this.getLastBlockSynced();
      this.syncTransactions(this.lastBlockNumberSynced);
    }, 30000);
  }

  getLastBlockSynced(): number {
    return parseInt(localStorage.getItem(`lastBlock_${this.wallet.address}`), 10);
  }

  ngOnDestroy() {
    this.destroyed = true;
    clearInterval(this.transactionSyncInterval);
  }

  async syncTransactions(lastBlockNumberSynced: number) {
    const currentTxHashes = this.transactions.map(x => x.hash.toUpperCase());
    this.endBlockNumber = await this.transactionsService.eth.getBlockNumber();
    const start = lastBlockNumberSynced || 0;

    this.logger.debug('Starting Transaction Sync @ Block' + start);

    for (let i = start; i < this.endBlockNumber; i++) {
      if (this.destroyed) {
        return;
      }
      this.syncing = true;
      this.lastBlockNumberSynced = i;

      if (i % 1000 === 0 || this.pendingTransactions.length > 0) {
        this.logger.debug('Transaction Sync @ Block #' + i);
        const transactions = await this.transactionsService.getTransactionsByAccount(this.wallet.address, i - 10, i + 1000);
        if (transactions.length > 0) {
          const transactionsToInsert = transactions.filter(x => !currentTxHashes.includes(x.hash.toUpperCase()));
          this.logger.debug(`Transactions Found: ${transactionsToInsert}`);
          if (this.pendingTransactions.length > 0) {
            await this.replacePendingTransactionWithConfirmed(transactions);
          }
          await this.transactionsPersistenceService.db.bulkDocs(
            transactions.filter(x => !this.pendingTransactions.map(y => y.hash).includes(x.hash)));
        }
      }
      if (i % 100) {
        localStorage.setItem(`lastBlock_${this.wallet.address}`, i.toString());
      }
    }
    const walletBalance = await this.transactionsService.eth.getBalance(this.wallet.address);
    this.wallet = {
      ...this.wallet,
      balance: this.transactionsService.utils.fromWei(walletBalance, 'ether'),
    };
    await this.refreshTransactions();
    this.syncing = false;
  }

  async onTransactionSent(tx: Transaction) {
    await this.refreshTransactions();
  }

  replacePendingTransactionWithConfirmed(transactionsToInsert: Transaction[]) {
    transactionsToInsert.forEach(newTx => {
      this.transactionsPersistenceService.pending.get(newTx.hash).then(pendingTx => {
        if (pendingTx) {
          return this.transactionsPersistenceService.db.put({
            ...newTx,
            _id: newTx.hash,
          }).then(putResult => {
            if (putResult.ok) {
              return this.transactionsPersistenceService.pending.put({ ...pendingTx, _deleted: true }).then(() => {
              }).catch(err => {
                this.logger.error('Trouble removing pending transaction' + err);
              });
            }
          }).catch(err => {
            this.logger.error('Trouble inserting transaction' + err);
          });
        }
      }).catch(() => {
          this.logger.error('Pending tx not found by hash ' + newTx.hash);
        });
    });
  }

  private async refreshTransactions() {
    const allTxs = await this.transactionsPersistenceService.db.allDocs({ include_docs: true });
    const allPending = await this.transactionsPersistenceService.pending.allDocs({ include_docs: true });
    this.transactions = allTxs.rows
      .map(x => x.doc)
      .filter(x => x.from.toUpperCase() === this.wallet.address.toUpperCase() || x.to.toUpperCase() === this.wallet.address.toUpperCase());
    this.pendingTransactions = allPending.rows
      .map(x => x.doc)
      .filter(x => x.from.toUpperCase() === this.wallet.address.toUpperCase() || x.to.toUpperCase() === this.wallet.address.toUpperCase());
    this.transactions = [...this.transactions, ...this.pendingTransactions];
  }
}

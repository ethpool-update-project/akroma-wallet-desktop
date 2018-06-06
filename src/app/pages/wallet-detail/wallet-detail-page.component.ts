import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Transaction } from '../../models/transaction';

import { Wallet } from '../../models/wallet';
import { TransactionsService } from '../../providers/transactions.service';
import { TransactionsPersistenceService } from '../../providers/transactions-persistence.service';
import { ElectronService } from '../../providers/electron.service';
import { clientConstants } from '../../providers/akroma-client.constants';
import { AkromaLoggerService } from '../../providers/akroma-logger.service';

@Component({
  selector: 'app-wallet-detail-page',
  templateUrl: './wallet-detail-page.component.html',
  styleUrls: ['./wallet-detail-page.component.scss']
})
export class WalletDetailPageComponent implements OnDestroy, OnInit {
  destroyed: boolean;
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  syncing: boolean;
  wallet: Wallet;

  constructor(private logger: AkromaLoggerService,
              private electronService: ElectronService,
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
    let lastBlockSynced = this.getLastBlockSynced();
    this.startSyncBlocks(lastBlockSynced);

    setInterval(async () => {
      if (this.syncing) {
        return;
      }
      await this.refreshTransactions();
      lastBlockSynced = this.getLastBlockSynced();
      this.startSyncBlocks(lastBlockSynced);
    }, 30000);
  }

  getLastBlockSynced(): number {
    return parseInt(localStorage.getItem(`lastBlock_${this.wallet.address}`), 10);
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  async startSyncBlocks(lastBlockSynced: number) {
    const currentTxHashes = this.transactions.map(x => x.hash);
    const endBlockNumber = await this.transactionsService.eth.getBlockNumber();
    const start = lastBlockSynced || 0;
    this.logger.debug('Starting Block Sync @ Block' + start);
    for (let i = start; i < endBlockNumber; i++) {
      this.syncing = true;
      if (this.destroyed) {
        this.logger.debug('Component is destroyed, I should quit syncing.');
        return;
      }
      if (i % 10 === 0) {
        this.logger.debug('Block Sync @ Block #' + i);
        const transactions = await this.transactionsService.getTransactionsByAccount(this.wallet.address, i, i + 10);
        if (transactions.length > 0) {
          const transactionsToInsert = transactions.filter(x => !currentTxHashes.includes(x.hash));
          this.logger.debug(`Transactions Found: ${transactionsToInsert}`);
          if (this.pendingTransactions.length > 0) {
            await this.replacePendingTransactionWithConfirmed(transactions);
          }
          await this.transactionsPersistenceService.db.bulkDocs(transactions);
        }
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
    const result = await this.transactionsPersistenceService.pending.put({
      hash: tx.hash,
      nonce: 0,
      blockHash: '',
      blockNumber: 0,
      transactionIndex: 0,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: '',
      gas: 2100,
      input: '',
      timestamp: new Date().getTime(),
      _id: tx.hash,
    });
    await this.refreshTransactions();
  }

  async replacePendingTransactionWithConfirmed(transactionsToInsert: Transaction[]) {
    transactionsToInsert.forEach(async newTx => {
      const foundTx = await this.transactionsPersistenceService.pending.get(newTx.hash);
      try {
        if (!!foundTx) {
          const result = await this.transactionsPersistenceService.db.put({
            ...newTx,
            _id: newTx.hash,
          });
        }
      } catch {
        await this.transactionsPersistenceService.pending.remove(foundTx);
      }
      this.logger.error(`Trouble inserting transaction ${newTx.hash}`);
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

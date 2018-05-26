import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import PouchDB from 'pouchdb';
import { ProgressbarConfig } from 'ngx-bootstrap/progressbar';

import { ISubscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import { distinctUntilChanged, mergeMap, retry } from 'rxjs/operators';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/of';

import { Web3Service } from '../../providers/web3.service';
import { AkromaClientService, statusConstants } from '../../providers/akroma-client.service';
import { clientConstants } from '../../providers/akroma-client.constants';
import { BlockSync } from '../../models/block-sync';

// such override allows to keep some initial values
export function getProgressbarConfig(): ProgressbarConfig {
  return Object.assign(new ProgressbarConfig(), { animate: true, striped: true,  max: 100});
}

@Component({
  selector: 'app-splash-page',
  templateUrl: './splash-page.component.html',
  styleUrls: ['./splash-page.component.scss'],
  providers: [{ provide: ProgressbarConfig, useFactory: getProgressbarConfig }]
})
export class SplashComponent implements OnDestroy, OnInit {
  clientStatus: string;
  lastPercentageSynced: number;
  isSyncing: boolean | BlockSync;
  isListening: boolean;
  peerCount: number;
  clientStatusSubscription: ISubscription;
  isListeningSubscription: ISubscription;
  isSyncingSubscription: ISubscription;
  peerCountSubscription: ISubscription;
  private blockSyncStore: PouchDB.Database<BlockSync>;

  constructor(private web3: Web3Service,
              private router: Router,
              private clientService: AkromaClientService) {
    this.web3.setProvider(new this.web3.providers.HttpProvider(clientConstants.connection.default));
    this.lastPercentageSynced = 0;
    this.clientStatus = '';
    this.blockSyncStore = new PouchDB('lastBlockSynced');
  }

  ngOnInit() {
    this.clientStatusSubscription = IntervalObservable.create(1000)
    .pipe(mergeMap((i) => Observable.of(this.clientService.status)))
    .pipe(distinctUntilChanged())
    .subscribe((status: string) => {
      this.clientStatus = status;
      if (status === statusConstants.DOWNLOADING) {
        return;
      }
      if (status === statusConstants.RUNNING) {
        this.startSyncingSubscriptions();
        this.clientStatusSubscription.unsubscribe();
      }
    });
  }

  private async startSyncingSubscriptions(): Promise<void> {
    let lastSynced: BlockSync;
    try {
      console.log('Start Syncing - Get lastSynced');
      lastSynced = await this.blockSyncStore.get('lastSynced');
    } catch {
      console.log('Start Syncing - FAIL Get lastSynced');
      console.log('Start Syncing - Put lastSynced');
      const results = await this.blockSyncStore.put({
        _id: 'lastSynced',
        currentBlock: 0,
        highestBlock: 0,
        knownStates: 0,
        pulledStates: 0,
        startingBlock: 0,
      });
      if (results.ok) {
        console.log('Start Syncing - Get lastSynced');
        lastSynced = await this.blockSyncStore.get('lastSynced');
      }
    }
    this.isListeningSubscription = IntervalObservable.create(2000)
    .pipe(mergeMap((i) => Observable.fromPromise(this.web3.eth.net.isListening())))
    .pipe(retry(10))
    .subscribe((result: boolean) => {
      console.log('is listening:' + result);
      this.isListening = result;
    });

    this.isSyncingSubscription = IntervalObservable.create(1000)
    .pipe(mergeMap((i) => Observable.fromPromise(this.web3.eth.isSyncing())))
    .pipe(retry(10))
    .subscribe(async (result: boolean | BlockSync) => {
      console.log('is syncing:' + JSON.stringify(result));
      if (this.isListening) {
        this.isSyncing = result;
        if (!!result) {
          lastSynced = {
            ...lastSynced,
            ...<BlockSync> result,
          };
          console.log('currentBlock:' + lastSynced.currentBlock + ' highestBlock:' + lastSynced.highestBlock);
        }
        if (!!lastSynced) {
          await this.blockSyncStore.put({
            ...lastSynced,
          });
          lastSynced = await this.blockSyncStore.get('lastSynced');

          console.log('currentBlock:' + lastSynced.currentBlock + ' highestBlock:' + lastSynced.highestBlock);
          this.lastPercentageSynced = this.currentPercentage(lastSynced.currentBlock, lastSynced.highestBlock);
        }
        console.log(result);
        console.log(this.lastPercentageSynced);
        console.log((this.lastPercentageSynced || 0).toFixed(0));
        if (result === false && this.lastPercentageSynced >= 98) {
          // Nav away here
          console.log('nav away...');
          // If user has not set up a wallet yet, send them to create / import wallet
          // ...else send them to their last used wallet?
          this.router.navigate(['/wallets']);
        }
      }
    });

    this.peerCountSubscription = IntervalObservable.create(15000)
    .pipe(mergeMap((i) => Observable.fromPromise(this.web3.eth.net.getPeerCount())))
    .pipe(retry(10))
    .subscribe((result: number) => {
      if (this.isListening) {
        this.peerCount = result;
      }
    });
  }

  currentPercentage(currentBlock: number, highestBlock: number): number {
    return currentBlock / highestBlock * 100;
  }

  hexToInt(hexValue: string): number {
    return parseInt(hexValue, 10);
  }

  ngOnDestroy() {
    this.isListeningSubscription.unsubscribe();
    this.isSyncingSubscription.unsubscribe();
    this.peerCountSubscription.unsubscribe();
  }
}

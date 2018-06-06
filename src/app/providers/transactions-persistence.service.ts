import { Injectable } from '@angular/core';

import PouchDB from 'pouchdb';

import { Transaction } from '../models/transaction';

@Injectable()
export class TransactionsPersistenceService {
  private _db: PouchDB.Database<Transaction>;
  private _pending: PouchDB.Database<Transaction>;

  get db(): PouchDB.Database<Transaction> {
    return this._db;
  }

  get pending(): PouchDB.Database<Transaction> {
    return this._pending;
  }

  constructor() {
    this._db = new PouchDB('transactions');
    this._pending = new PouchDB('pending_transactions');
  }
}

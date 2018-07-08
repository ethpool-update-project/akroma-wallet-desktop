import { Transaction as Web3Transaction } from 'web3/types';

import { PouchEntity } from './pouch-entity';

export interface Transaction extends Web3Transaction, PouchEntity {
    timestamp: number;
}

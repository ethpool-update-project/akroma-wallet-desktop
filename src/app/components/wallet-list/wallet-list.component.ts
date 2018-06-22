import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/of';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import { distinctUntilChanged, mergeMap, retry } from 'rxjs/operators';
import { Wallet } from '../../models/wallet';
import { clientConstants } from '../../providers/akroma-client.constants';
import { ElectronService } from '../../providers/electron.service';
import { SettingsPersistenceService } from '../../providers/settings-persistence.service';
import { WalletPersistenceService } from '../../providers/wallet-persistence.service';
import { Web3Service } from '../../providers/web3.service';
import { AkromaLoggerService } from '../../providers/akroma-logger.service';

const electron = window.require('electron');

@Component({
  selector: 'app-wallet-list',
  templateUrl: './wallet-list.component.html',
  styleUrls: ['./wallet-list.component.scss']
})
export class WalletListComponent implements OnInit {
  modalRef: BsModalRef;
  allWalletsBalance: number;
  allWalletsBalanceLoading: boolean;
  walletForm: FormGroup;
  wallets: Wallet[];

  constructor(private formBuilder: FormBuilder,
              private modalService: BsModalService,
              private web3: Web3Service,
              private walletService: WalletPersistenceService,
              private settingsService: SettingsPersistenceService,
              private electronService: ElectronService,
              private logger: AkromaLoggerService) {
    this.web3.setProvider(new this.web3.providers.HttpProvider(clientConstants.connection.default));
    this.walletForm = this.formBuilder.group(
      { name: '', passphrase: '', confirmPassphrase: '' },
      { validator: this.passphraseMatchValidator },
    );
    this.allWalletsBalance = 0;
    this.allWalletsBalanceLoading = true;
  }

  async ngOnInit() {
    const allDocs = await this.walletService.db.allDocs({ include_docs: true });
    this.wallets = allDocs.rows.map(x => x.doc);
    const subscription = IntervalObservable.create(5000)
    .pipe(mergeMap((i) => Observable.fromPromise(this.web3.eth.personal.getAccounts())))
    .pipe(retry(10))
    .pipe(distinctUntilChanged())
    .subscribe(async (wallets: string[]) => {
      wallets.forEach(wallet => {
        const storedWallet = allDocs.rows.find(x => x.doc.address === wallet);
        if (!!storedWallet) {
          return;
        }

        this.wallets.push({
          name: 'Unnamed Wallet',
          address: wallet,
          _id: wallet,
        });
      });
      await this.getWalletBalances(this.wallets.map(x => x.address));
      subscription.unsubscribe();
    });
  }

  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template);
  }

  passphraseMatchValidator(g: FormGroup) {
    return g.get('passphrase').value === g.get('confirmPassphrase').value
    ? null : {'passphraseMatch': true};
  }

  async createWallet(walletForm: FormGroup = this.walletForm) {
    this.modalRef.hide();
    const newWalletAddress = await this.web3.eth.personal.newAccount(walletForm.get('passphrase').value);
    const newWalletObject: Wallet = {
      _id: newWalletAddress,
      address: newWalletAddress,
      name: this.walletForm.get('name').value,
    };
    this.walletService.db.put(newWalletObject);
    this.wallets.push(await this.walletService.db.get(newWalletObject._id));
    this.walletForm.reset();
  }

  async deleteWallet(wallet: Wallet) {
    const systemSettings = await this.settingsService.db.get('system');
    const keystoreFileDir = `${systemSettings.clientPath}/data/keystore`;
    const keystoreFileList = this.electronService.fs.readdirSync(keystoreFileDir);
    const keystoreFile = keystoreFileList.find(x => x.toLowerCase().includes(wallet.address.replace('0x', '').toLowerCase()));
    if (keystoreFile) {
      await this.electronService.fs.unlinkSync(`${keystoreFileDir}/${keystoreFile}`);
      try {
        const result = await this.walletService.db.remove(wallet._id, wallet._rev);
        if (result.ok) {
          this.wallets = this.wallets.filter(x => x._id !== wallet._id);
        }
      } catch {
        this.wallets = this.wallets.filter(x => x._id !== wallet._id);
        this.logger.debug(`Wallet ${wallet.address} not removed from database ` +
          `because it did not exist, but keystore file has been deleted.`);
      }
      this.modalRef.hide();
    }
  }

  async getWalletBalances(addresses: string[]) {
    if (addresses.length === 0) {
      this.allWalletsBalanceLoading = false;
      return;
    }

    for (let i = 0; i < addresses.length; i++) {
      const balance = await this.web3.eth.getBalance(addresses[i]);
      this.allWalletsBalance += parseInt(balance, 10);
      this.allWalletsBalanceLoading = false;
    }
  }

  backupWalletReminder(wallet: Wallet, template: TemplateRef<any>) {
    this.openModal(template);
    this.modalRef.content = { wallet };
  }

  copyAddress(wallet: Wallet) {
    electron.clipboard.writeText(wallet.address);
  }

  async backupWallet(wallet: Wallet) {
    const systemSettings = await this.settingsService.db.get('system');
    const keystoreFileDir = `${systemSettings.clientPath}/data/keystore`;
    const keystoreFileList = await this.electronService.fs.readdirSync(keystoreFileDir);
    const keystoreFile = keystoreFileList.find(x => x.toLowerCase().includes(wallet.address.replace('0x', '').toLowerCase()));
    if (keystoreFile) {
      electron.shell.showItemInFolder(`${keystoreFileDir}/${keystoreFile}`);
    }
  }
}

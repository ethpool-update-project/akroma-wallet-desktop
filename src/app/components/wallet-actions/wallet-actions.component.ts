import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wallet-actions',
  templateUrl: './wallet-actions.component.html',
  styleUrls: ['./wallet-actions.component.scss'],
})
export class WalletActionsComponent implements OnInit {
  @Output() send: EventEmitter<null>;

  constructor(private router: Router) {
    this.send = new EventEmitter<null>();
  }

  ngOnInit() {
  }

  navigate(targetRoute: string) {
    this.router.navigate([targetRoute]);
  }

  sendClick() {
    this.send.emit();
  }
}

/*
 * Polkascan Explorer GUI
 *
 * Copyright 2018-2020 openAware BV (NL).
 * This file is part of Polkascan.
 *
 * Polkascan is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Polkascan is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Polkascan. If not, see <http://www.gnu.org/licenses/>.
 *
 * account-detail.component.ts
 */

import {Component, OnDestroy, OnInit} from '@angular/core';
import {DocumentCollection} from 'ngx-jsonapi';
import {Extrinsic} from '../../classes/extrinsic.class';
import {Event} from '../../classes/event.class';
import {BalanceTransferService} from '../../services/balance-transfer.service';
import {ExtrinsicService} from '../../services/extrinsic.service';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {Observable, Subscription} from 'rxjs';
import {Account} from '../../classes/account.class';
import {AccountService} from '../../services/account.service';
import {switchMap} from 'rxjs/operators';
import {BalanceTransfer} from '../../classes/balancetransfer.class';
import {AppConfigService} from '../../services/app-config.service';
import {AccountIndexService} from '../../services/account-index.service';
import {EventService} from '../../services/event.service';

@Component({
  selector: 'app-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss']
})
export class AccountDetailComponent implements OnInit, OnDestroy {

  private networkSubscription: Subscription;

  public balanceTransfers: DocumentCollection<BalanceTransfer>;
  public extrinsics: DocumentCollection<Extrinsic>;
  public slashes: DocumentCollection<Event>;
  public councilActivity: DocumentCollection<Event>;

  public balanceTransfersPage = 1;
  public extrinsicsPage = 1;
  public slashesPage = 1;
  public councilActivityPage = 1;

  public accountId: string;

  public account$: Observable<Account>;

  public networkURLPrefix: string;
  public networkTokenDecimals: number;
  public networkTokenSymbol: string;

  public currentTab: string;
  private fragmentSubsription: Subscription;
  private queryParamsSubsription: Subscription;

  constructor(
    private balanceTransferService: BalanceTransferService,
    private extrinsicService: ExtrinsicService,
    private eventService: EventService,
    private accountService: AccountService,
    private accountIndexService: AccountIndexService,
    private appConfigService: AppConfigService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit() {

    this.currentTab = 'transactions';

    this.fragmentSubsription = this.activatedRoute.fragment.subscribe(value => {
      if (['roles', 'transactions', 'slashes', 'transfers', 'council'].includes(value)) {
        this.currentTab = value;
      }
    });

    this.networkSubscription = this.appConfigService.getCurrentNetwork().subscribe( network => {

      this.networkURLPrefix = this.appConfigService.getUrlPrefix();

      this.networkTokenDecimals = +network.attributes.token_decimals;
      this.networkTokenSymbol = network.attributes.token_symbol;

      this.account$ = this.activatedRoute.paramMap.pipe(
        switchMap((params: ParamMap) => {
          return this.accountService.get(params.get('id'));
        })
      );

      this.account$.subscribe(val => {
        if (val.attributes.address) {

          this.accountId = val.attributes.address;

          this.queryParamsSubsription = this.activatedRoute.queryParams.subscribe(queryParams => {
            this.extrinsicsPage = +queryParams.extrinsicsPage || 1;
            this.getTransactions(this.extrinsicsPage);

            this.balanceTransfersPage = +queryParams.balanceTransfersPage || 1;
            this.getBalanceTransfers(this.balanceTransfersPage);

            if (val.attributes.was_validator || val.attributes.was_nominator) {
              this.slashesPage = +queryParams.slashesPage || 1;
              this.getSlashEvents(this.slashesPage);
            }

            if (val.attributes.was_council_member) {
              this.slashesPage = +queryParams.slashesPage || 1;
              this.getCouncilActivity(this.councilActivityPage);
            }
          });
        }
      });
    });
  }

  public formatBalance(balance: number) {
    return balance / Math.pow(10, this.networkTokenDecimals);
  }

  public getTransactions(page: number) {
    this.extrinsicService.all({
      page: {number: page, size: 25},
      remotefilter: {address: this.accountId},
    }).subscribe(extrinsics => {
      this.extrinsics = extrinsics;
    });
  }

  public getBalanceTransfers(page: number) {
    this.balanceTransferService.all({
      remotefilter: {address: this.accountId},
      page: {number: page}
    }).subscribe(balanceTransfers => (this.balanceTransfers = balanceTransfers));
  }

  public getSlashEvents(page: number) {
     this.eventService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: 1},
      }).subscribe(events => {
        this.slashes = events;
      });
  }

  public getCouncilActivity(page: number) {
     this.eventService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: '4,5'},
      }).subscribe(events => {
        this.councilActivity = events;
      });
  }

  ngOnDestroy() {
    // Will clear when component is destroyed e.g. route is navigated away from.
    this.networkSubscription.unsubscribe();
    if (this.fragmentSubsription) {
      this.fragmentSubsription.unsubscribe();
    }
    if (this.queryParamsSubsription) {
      this.queryParamsSubsription.unsubscribe();
    }
  }

  public formatUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    } else {
      return 'http://' + url;
    }
  }
}

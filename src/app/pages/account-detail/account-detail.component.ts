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
import {BlockTotal} from '../../classes/block-total.class';
import {BlockTotalService} from '../../services/block-total.service';

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
  public memberActivity: DocumentCollection<Event>;
  public electionActivity: DocumentCollection<Extrinsic>;
  public imOnlineActivity: DocumentCollection<Event>;
  public stakingBondActivity: DocumentCollection<Extrinsic>;
  public identityActivity: DocumentCollection<Event>;
  public authoredBlocks: DocumentCollection<BlockTotal>;
  public accountLifecycle: DocumentCollection<Event>;

  public balanceTransfersPage = 1;
  public extrinsicsPage = 1;
  public slashesPage = 1;
  public councilActivityPage = 1;
  public electionActivityPage = 1;
  public memberActivityPage = 1;
  public stakingBondActivityPage = 1;
  public imOnlineActivityPage = 1;
  public identityActivityPage = 1;
  public authoredBlocksPage = 1;
  public accountLifecyclePage = 1;

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
    private blockTotalService: BlockTotalService,
    private accountService: AccountService,
    private accountIndexService: AccountIndexService,
    private appConfigService: AppConfigService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit() {

    this.currentTab = 'transactions';

    this.fragmentSubsription = this.activatedRoute.fragment.subscribe(value => {
      if ([
        'roles', 'transactions', 'slashes', 'transfers', 'council', 'election', 'member',
        'bonding', 'imonline', 'identity', 'authoredblocks', 'lifecycle'
      ].includes(value)) {
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

            this.identityActivityPage = +queryParams.identityActivityPage || 1;
            this.getIdentityActivity(this.identityActivityPage);

            this.accountLifecyclePage = +queryParams.accountLifecyclePage || 1;
            this.getAccountLifecycle(this.accountLifecyclePage);

            if (val.attributes.was_validator || val.attributes.was_nominator) {

              // Validator & Nominator tabs
              this.slashesPage = +queryParams.slashesPage || 1;
              this.getSlashEvents(this.slashesPage);
              this.stakingBondActivityPage = +queryParams.stakingBondActivityPage || 1;
              this.getStakingBondActivity(this.stakingBondActivityPage);
              this.imOnlineActivityPage = +queryParams.imOnlineActivityPage || 1;
              this.getImOnlineActivity(this.imOnlineActivityPage);
              this.authoredBlocksPage = +queryParams.authoredBlocksPage || 1;
              this.getAuthoredBlocks(this.authoredBlocksPage);
            }

            if (val.attributes.was_council_member) {
              // Council member tabs
              this.councilActivityPage = +queryParams.councilPage || 1;
              this.getCouncilActivity(this.councilActivityPage);

              this.electionActivityPage = +queryParams.electionActivityPage || 1;
              this.getElectionActivity(this.electionActivityPage);

              this.memberActivityPage = +queryParams.memberActivityPage || 1;
              this.getMemberActivity(this.memberActivityPage);
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

  public getMemberActivity(page: number) {
     this.eventService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: '23,24'},
      }).subscribe(events => {
        this.memberActivity = events;
      });
  }

  public getElectionActivity(page: number) {
     this.extrinsicService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: '25,26,27'},
      }).subscribe(extrinsics => {
        this.electionActivity = extrinsics;
      });
  }

  public getStakingBondActivity(page: number) {
     this.extrinsicService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: '6,7,8,10,11,12,19'},
      }).subscribe(extrinsics => {
        this.stakingBondActivity = extrinsics;
      });
  }

  public getImOnlineActivity(page: number) {
   this.eventService.all({
      page: {number: page, size: 25},
      remotefilter: {address: this.accountId, search_index: '3,9'},
    }).subscribe(events => {
      this.imOnlineActivity = events;
    });
  }

  public getIdentityActivity(page: number) {
     this.eventService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: '13,14,15,16,17,18,20'},
      }).subscribe(events => {
        this.identityActivity = events;
      });
  }

  public getAuthoredBlocks(page: number) {
    this.blockTotalService.all({
      page: {number: page, size: 25},
      remotefilter: {author: this.accountId},
    }).subscribe(blocks => this.authoredBlocks = blocks);
  }

  public getAccountLifecycle(page: number) {
     this.eventService.all({
        page: {number: page, size: 25},
        remotefilter: {address: this.accountId, search_index: '21,22'},
      }).subscribe(events => {
        this.accountLifecycle = events;
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

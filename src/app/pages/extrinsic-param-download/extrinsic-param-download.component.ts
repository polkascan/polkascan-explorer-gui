import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {AppConfigService} from '../../services/app-config.service';

@Component({
  selector: 'app-extrinsic-param-download',
  templateUrl: './extrinsic-param-download.component.html',
  styleUrls: ['./extrinsic-param-download.component.scss']
})
export class ExtrinsicParamDownloadComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appConfigService: AppConfigService
  ) { }

  ngOnInit() {
    this.appConfigService.getCurrentNetwork().subscribe( network => {
      this.route.paramMap.subscribe(
        (params: ParamMap) => {
          if (params.get('extrinsicId') && params.get('hash')) {
            window.open(
              network.attributes.api_url_root + '/extrinsic-param/download/' + params.get('extrinsicId') + '/' +
              params.get('hash'));
            window.history.back();
          }
      });
    });
  }

}

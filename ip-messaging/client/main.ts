///<reference path="../typings/browser.d.ts" />

import { enableProdMode } from '@angular/core';
import { bootstrap } from '@angular/platform-browser-dynamic';
import { HTTP_PROVIDERS } from '@angular/http';

import { AppComponent } from './components/app.component';

import { AccountService } from './services/account.service';
import { TwilioService } from './services/twilio.service';
import { VirgilService } from './services/virgil.service';
import { BackendService } from './services/backend.service';

import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/map';

enableProdMode();

bootstrap(AppComponent, [HTTP_PROVIDERS, BackendService, AccountService, TwilioService, VirgilService])
    .then(success => console.log('Bootstrap success'))
    .catch(error => console.log(error));

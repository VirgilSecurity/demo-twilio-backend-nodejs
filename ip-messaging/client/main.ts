///<reference path="../typings/browser.d.ts" />
import { enableProdMode } from '@angular/core';
import { bootstrap } from '@angular/platform-browser-dynamic';
import { ROUTER_PROVIDERS } from '@angular/router';
import { HTTP_PROVIDERS }    from '@angular/http';

import { AppComponent } from './components/app.component';
import { AccountService } from './services/account.service'
import { VirgilService } from './services/virgil.service'

bootstrap(AppComponent, [ROUTER_PROVIDERS, HTTP_PROVIDERS, AccountService, VirgilService])
    .then(success => console.log('Bootstrap success'))
    .catch(error => console.log(error));

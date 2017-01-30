import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule }    from '@angular/http';
import { FormsModule }    from '@angular/forms';

import { AppComponent } from './components/app.component';
import { ChatComponent } from './components/chat.component';
import { LoginComponent } from './components/login.component';
import { ModalTriggerDirective } from './directives/modal.directive';
import { ScrollIntoViewDirective } from './directives/scroll-into-view.directive';
import { SidebarDirective } from './directives/sidebar.directive';
import { TooltipDirective } from './directives/tooltip.directive';
import { FromNowPipe } from './pipes/from-now.pipe';

import { AccountService } from './services/account.service';
import { TwilioService } from './services/twilio.service';
import { VirgilService } from './services/virgil.service';
import { BackendService } from './services/backend.service';

@NgModule({
    imports: [
        BrowserModule,
        HttpModule,
        FormsModule
    ],
    declarations: [
        AppComponent,
        ChatComponent,
        LoginComponent,
        ModalTriggerDirective,
        ScrollIntoViewDirective,
        SidebarDirective,
        TooltipDirective,
        FromNowPipe
    ],
    providers: [
        AccountService,
        TwilioService,
        VirgilService,
        BackendService
    ],
    bootstrap:    [ AppComponent ]
})

export class AppModule { }

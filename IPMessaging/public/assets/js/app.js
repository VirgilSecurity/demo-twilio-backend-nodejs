var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
System.register("services/account.service", ['@angular/core'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var core_1;
    var Account, AccountService;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            }],
        execute: function() {
            Account = (function () {
                function Account(id, name) {
                    this.id = id;
                    this.name = name;
                }
                Account.fromJson = function (json) {
                    var accountObject = JSON.parse(json);
                    return new Account(accountObject.id, accountObject.name);
                };
                return Account;
            }());
            exports_1("Account", Account);
            AccountService = (function () {
                function AccountService() {
                    this.currentAccount = null;
                }
                AccountService.prototype.isLoggedIn = function () {
                    return this.currentAccount != null;
                };
                AccountService.prototype.login = function (id, name, keyPair) {
                };
                AccountService.prototype.getAccount = function () {
                    var accountJsonString = localStorage.getItem('account');
                    if (accountJsonString == null) {
                        return null;
                    }
                    return Account.fromJson(accountJsonString);
                };
                AccountService = __decorate([
                    core_1.Injectable(), 
                    __metadata('design:paramtypes', [])
                ], AccountService);
                return AccountService;
            }());
            exports_1("AccountService", AccountService);
        }
    }
});
System.register("services/virgil.service", ['@angular/core'], function(exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    var core_2;
    var VirgilService;
    return {
        setters:[
            function (core_2_1) {
                core_2 = core_2_1;
            }],
        execute: function() {
            VirgilService = (function () {
                function VirgilService() {
                }
                VirgilService.prototype.initialize = function (accessToken) {
                    this.sdk = new VirgilSDK(accessToken);
                    this.crypto = this.sdk.crypto;
                };
                VirgilService = __decorate([
                    core_2.Injectable(), 
                    __metadata('design:paramtypes', [])
                ], VirgilService);
                return VirgilService;
            }());
            exports_2("VirgilService", VirgilService);
        }
    }
});
System.register("components/login.component", ['@angular/core', '@angular/http', '@angular/router', "services/account.service", "services/virgil.service"], function(exports_3, context_3) {
    "use strict";
    var __moduleName = context_3 && context_3.id;
    var core_3, http_1, router_1, account_service_1, virgil_service_1;
    var LoginComponent;
    return {
        setters:[
            function (core_3_1) {
                core_3 = core_3_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            },
            function (router_1_1) {
                router_1 = router_1_1;
            },
            function (account_service_1_1) {
                account_service_1 = account_service_1_1;
            },
            function (virgil_service_1_1) {
                virgil_service_1 = virgil_service_1_1;
            }],
        execute: function() {
            LoginComponent = (function () {
                function LoginComponent(http, account, virgil, router) {
                    this.http = http;
                    this.account = account;
                    this.virgil = virgil;
                    this.router = router;
                }
                LoginComponent.prototype.onLogin = function () {
                    this.memberName = '';
                    //this.http.get("")
                    this.router.navigate(['/chat']);
                };
                LoginComponent = __decorate([
                    core_3.Component({
                        templateUrl: './components/login.component.html'
                    }), 
                    __metadata('design:paramtypes', [http_1.Http, account_service_1.AccountService, virgil_service_1.VirgilService, router_1.Router])
                ], LoginComponent);
                return LoginComponent;
            }());
            exports_3("LoginComponent", LoginComponent);
        }
    }
});
System.register("components/chat.component", ['@angular/core'], function(exports_4, context_4) {
    "use strict";
    var __moduleName = context_4 && context_4.id;
    var core_4;
    var ChatComponent;
    return {
        setters:[
            function (core_4_1) {
                core_4 = core_4_1;
            }],
        execute: function() {
            ChatComponent = (function () {
                function ChatComponent() {
                }
                ChatComponent.prototype.ngOnInit = function () {
                };
                ChatComponent = __decorate([
                    core_4.Component({
                        templateUrl: './components/chat.component.html'
                    }), 
                    __metadata('design:paramtypes', [])
                ], ChatComponent);
                return ChatComponent;
            }());
            exports_4("ChatComponent", ChatComponent);
        }
    }
});
System.register("components/app.component", ['@angular/core', '@angular/router', "components/login.component", "components/chat.component", "services/account.service"], function(exports_5, context_5) {
    "use strict";
    var __moduleName = context_5 && context_5.id;
    var core_5, router_2, login_component_1, chat_component_1, account_service_2;
    var AppComponent;
    return {
        setters:[
            function (core_5_1) {
                core_5 = core_5_1;
            },
            function (router_2_1) {
                router_2 = router_2_1;
            },
            function (login_component_1_1) {
                login_component_1 = login_component_1_1;
            },
            function (chat_component_1_1) {
                chat_component_1 = chat_component_1_1;
            },
            function (account_service_2_1) {
                account_service_2 = account_service_2_1;
            }],
        execute: function() {
            AppComponent = (function () {
                function AppComponent(router, accountService) {
                    this.router = router;
                    this.accountService = accountService;
                }
                AppComponent.prototype.ngOnInit = function () {
                    if (this.accountService.isLoggedIn()) {
                        this.router.navigate(['/chat']);
                        return;
                    }
                    this.router.navigate(['/login']);
                };
                AppComponent = __decorate([
                    core_5.Component({
                        selector: 'virgil-twilio-ip-messaging',
                        templateUrl: './components/app.component.html',
                        directives: [router_2.ROUTER_DIRECTIVES]
                    }),
                    router_2.Routes([
                        { path: '/login', component: login_component_1.LoginComponent },
                        { path: '/chat', component: chat_component_1.ChatComponent }
                    ]), 
                    __metadata('design:paramtypes', [router_2.Router, account_service_2.AccountService])
                ], AppComponent);
                return AppComponent;
            }());
            exports_5("AppComponent", AppComponent);
        }
    }
});
System.register("main", ['@angular/platform-browser-dynamic', '@angular/router', '@angular/http', "components/app.component", "services/account.service", "services/virgil.service"], function(exports_6, context_6) {
    "use strict";
    var __moduleName = context_6 && context_6.id;
    var platform_browser_dynamic_1, router_3, http_2, app_component_1, account_service_3, virgil_service_2;
    return {
        setters:[
            function (platform_browser_dynamic_1_1) {
                platform_browser_dynamic_1 = platform_browser_dynamic_1_1;
            },
            function (router_3_1) {
                router_3 = router_3_1;
            },
            function (http_2_1) {
                http_2 = http_2_1;
            },
            function (app_component_1_1) {
                app_component_1 = app_component_1_1;
            },
            function (account_service_3_1) {
                account_service_3 = account_service_3_1;
            },
            function (virgil_service_2_1) {
                virgil_service_2 = virgil_service_2_1;
            }],
        execute: function() {
            platform_browser_dynamic_1.bootstrap(app_component_1.AppComponent, [router_3.ROUTER_PROVIDERS, http_2.HTTP_PROVIDERS, account_service_3.AccountService, virgil_service_2.VirgilService])
                .then(function (success) { return console.log('Bootstrap success'); })
                .catch(function (error) { return console.log(error); });
        }
    }
});
//# sourceMappingURL=app.js.map
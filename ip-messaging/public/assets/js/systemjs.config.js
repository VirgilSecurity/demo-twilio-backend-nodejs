(function(global) {

  var ngVer = '@2.0.0-rc.1';

  // map tells the System loader where to look for things
  var map = {
      'app'                                  : './assets/js/app',
      'rxjs'                                 : './assets/rxjs',
      'moment'                               : './assets/moment',
      'angular2-in-memory-web-api'           : './assets/angular2-in-memory-web-api',
      '@angular'                             : './assets/@angular',
      '@angular/common'                      : './assets/@angular/common',
      '@angular/compiler'                    : './assets/@angular/compiler',
      '@angular/core'                        : './assets/@angular/core',
      '@angular/http'                        : './assets/@angular/http',
      '@angular/platform-browser'            : './assets/@angular/platform-browser',
      '@angular/platform-browser-dynamic'    : './assets/@angular/platform-browser-dynamic',
      // '@angular/router'                      : './assets/@angular/router',
      // '@angular/router-deprecated'           : './assets/@angular/router-deprecated',
      // '@angular/upgrade'                     : './assets/@angular/upgrade',
      'lodash'                               : './assets/lodash/lodash.js'
  };
  
  // packages tells the System loader how to load when no filename and/or no extension
  var packages = {
      'app'                                  : { main: 'main.js',  defaultExtension: 'js' },
      'rxjs'                                 : { defaultExtension: 'js' },
      'moment'                               : { main: 'moment.js', defaultExtension: 'js' },
      'angular2-in-memory-web-api'           : { defaultExtension: 'js' },
      '@angular/common'                      : { main: 'common.umd.js', defaultExtension: 'js' },
      '@angular/compiler'                    : { main: 'compiler.umd.js', defaultExtension: 'js' },
      '@angular/core'                        : { main: 'core.umd.js', defaultExtension: 'js' },
      '@angular/http'                        : { main: 'http.umd.js', defaultExtension: 'js' },
      '@angular/platform-browser'            : { main: 'platform-browser.umd.js', defaultExtension: 'js' },
      '@angular/platform-browser-dynamic'    : { main: 'platform-browser-dynamic.umd.js', defaultExtension: 'js' }
      // '@angular/router'                      : { main: 'router.umd.js', defaultExtension: 'js' },
      // '@angular/router-deprecated'           : { main: 'router-deprecated.umd.js', defaultExtension: 'js' },
      // '@angular/upgrade'                     : { main: 'upgrade.umd.js', defaultExtension: 'js' }
  };

  var config = {
    transpiler: 'typescript',
    typescriptOptions: {
      emitDecoratorMetadata: true
    },
    map: map,
    packages: packages
  }

  // filterSystemConfig - index.html's chance to modify config before we register it.
  if (global.filterSystemConfig) { global.filterSystemConfig(config); }

  System.config(config);

})(this);
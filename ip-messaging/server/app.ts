/// <reference path="../typings/main.d.ts" />
import * as express from "express";

const app: express.Application = express();
app.disable("x-powered-by");

app.use(express.static("./public"));
app.use('/assets/js/', express.static('./node_modules/es6-shim/'));
app.use('/assets/js/', express.static('./node_modules/zone.js/dist/'));
app.use('/assets/js/', express.static('./node_modules/reflect-metadata/'));
app.use('/assets/js/', express.static('./node_modules/systemjs/dist/'));
app.use('/assets/js/', express.static('./node_modules/virgil-sdk/dist/'));
app.use('/assets/js/', express.static('./node_modules/jquery/dist/'));

app.listen(3000, function () {
    
});
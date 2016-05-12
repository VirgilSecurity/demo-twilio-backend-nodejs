/// <reference path="../typings/main.d.ts" />
import * as express from "express";

const app: express.Application = express();
app.disable("x-powered-by");

app.use(express.static("./public"));
app.use('/assets/', express.static('./node_modules/'));

app.listen(3000, function () {
    
});
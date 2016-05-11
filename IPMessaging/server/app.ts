/// <reference path="../typings/main.d.ts" />
import * as express from "express";

const app: express.Application = express();
app.disable("x-powered-by");

app.use(express.static("./public"));

// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
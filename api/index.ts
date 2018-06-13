import express from "express";
import router from "./routes";
import { validateConfig } from "../utils/validateConfig";
import config from '../config.json';

validateConfig(config).forEach(param => {
    if (!param) throw Error(param + " is missing in config.json");
});

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    res.status(500);
    res.render("error", { error: err });
};

const app = express();

app.use(errorHandler);
app.use(express.json());
app.use('/', router);

export default app;

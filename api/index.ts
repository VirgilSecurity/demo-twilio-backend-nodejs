import express from "express";
import config from '../config.json';
import router from "./routes";

if (!config) {
    throw Error("You need to put config.json from Virgil Dashboard file in project directory");
}

// Check config json params
const params = [
    "APP_ID",
    "API_KEY_ID",
    "API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_SERVICE_SID"
];

params.forEach(param => {
    if (!config[param]) throw Error(param + " is missing in config.json");
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

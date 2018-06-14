import express from "express";
import router from "./routes";

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    res.status(500);
    res.render("error", { error: err });
};

const app = express();

app.use(errorHandler);
app.use(express.json());
app.use('/', router);

export default app;

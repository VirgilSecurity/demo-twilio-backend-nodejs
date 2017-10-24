const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const router = require('./services/router');
const errors = require('./services/errors');
const logger = require('./services/logger');

const port = process.env.PORT || 3000;

const app = express();

app.use(helmet());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(enableCORS);
app.use('/v1', router);
app.use(handleError);

app.listen(port, () => {
	if (process.env.NODE_ENV !== 'production') {
		logger.info(`Web server listening on ${port}...`);
	}
});

module.exports = app;

function enableCORS(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization' );
	res.header('Access-Control-Max-Age', 86400);

	next();
}

function handleError(err, req, res, next) {
	let error;
	if (err instanceof errors.ApiError) {
		error = err;
	} else {
		logger.error('Unexpected error', err);
		error = errors.INTERNAL_ERROR();
	}

	res.status(error.status)
		.json(error.toJSON());
}
const Memcached = require('memcached');
const logger = require('./logger');

const servers = process.env.MEMCACHED_SERVERS ? process.env.MEMCACHED_SERVERS.split(/\s*,\s*/) : [];
const client = new Memcached(
	servers,
	{
		retries: 3,
		failures: 3,
		retry: 10000,
		remove: true
	}
);

client.on('failure', details => {
	logger.error(`Server ${details.server} went down: ${details.messages.join('')}`);
});

module.exports = client;

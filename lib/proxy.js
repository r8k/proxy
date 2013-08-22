/**
 * [Module Dependencies]
 * @type {[CommonJS]}
 */
http    = require('http'),
https   = require('https'),
url     = require('url'),
crypto  = require('crypto'),
Redis   = require('redis');

/**
 * [userModule Dependencies]
 * @type {[CommonJS]}
 */
Logger  = require('./logger'),
config  = require('./config'),
md5     = require('./entropy'),
utils   = require('./utils'),
testsvr = require('./test');

/**
 * Expose config as globals
 * for example `redishost` etc.
 */
utils.configParser();

/**
 * [Logger, for all our needs]
 * @type {[Logger]}
 */
log = new Logger();

/**
 * connect to Redis
 * @type {[Redis]}
 */
redis  = Redis.createClient(redisport, redishost);
redis.on("error", utils.redisError);

/**
 * [server: our Proxy Server]
 * @type {[proxyServer]}
 */
server      = http.createServer();
server.port = proxyserverport;
server.name = 'ProxyServer';

/**
 * [testServer: for Test purposes]
 * @type {[testServer]}
 */
testServer  = testsvr.initTestServer();

/**
 * [servers arrayList]
 * @type {[Array]}
 */
servers     = [server, testServer];

/**
 * [Listen to all incoming http requests]
 * @param  {[http request]}  req [http incoming request]
 * @param  {[http response]} res [http outgoing response]
 * @type {[EventListener]}
 */
server.on('request', function(req, res) {
	var creq = utils.parseRequest(req);
	var _options = utils.getOptions(creq);

    req.on("close", function() {
        this.connection.destroy();
    });
	
    utils.proxyRequest(req, _options, creq, res);
});

/**
 * [httpServer Error Handler]
 * @type {[EventListener]}
 */
utils.errorHandler(servers);

/**
 * [start the Server]
 * @type {[proxyServer]}
 */
utils.startServers(servers);

/**
 * [process Event Handlers]
 * @type {[EventListener]}
 */
process.on('SIGINT', utils.closeServers);
process.on('SIGTERM', utils.closeServers);
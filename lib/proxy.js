/**
 * [Module Dependencies]
 * @type {[CommonJS]}
 */
http    = require('http'),
https   = require('https'),
url     = require('url'),
fs      = require('fs'),
net     = require('net'),
zlib    = require('zlib'),
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
redis.on('error', utils.redisError);

/**
 * [server: our Proxy Server]
 * @type {[proxyServer]}
 */
server      = http.createServer();
server.port = proxyserverport;
server.name = 'ProxyServer';

/**
 * [OwlServer: Https Listener]
 * @type {[proxyServer]}
 */
Owl       = https.createServer(https_options);
Owl.port  = owlserverport;
Owl.name  = 'OwlServer';

/**
 * [servers arrayList]
 * @type {[Array]}
 */
servers     = [server, Owl];

/**
 * [Listen to all incoming http requests]
 * @param  {[http request]}  req [http incoming request]
 * @param  {[http response]} res [http outgoing response]
 * @type {[EventListener]}
 */
server.on('request', function(req, res) {
    var creq = utils.parseRequest(req);
    var _options = utils.getOptions(creq);

    req.on('close', function() {
        this.connection.destroy();
    });
    
    utils.proxyRequest(req, _options, creq, res);
});

Owl.on('request', function (req, res) {
    req.url = utils.buildRequest(req);
    var creq = utils.parseRequest(req);
    var _options = utils.getOptions(creq);

    req.on('close', function() {
        this.connection.destroy();
    });
    
    utils.proxyRequest(req, _options, creq, res);
});

/**
 * [Listen to all incoming http connects]
 * @param  {[http request]}  req    [http incoming request]
 * @param  {[tcp socket]}    socket [tcp incoming socket]
 * @param  {[Buffer head]}   head   [Buffer::Incoming]
 * @type {[EventListener]}
 */
server.on('connect', function(req, socket, head) {
    // w/o this handler, socket is destroyed :: socket.destroy()
    // https://github.com/joyent/node/blob/master/lib/_http_server.js#L381
    var proxy = net.createConnection(owlserverport, LOCAL_HOST);

    // create the listeners outside, for perf reasons.
    proxy.on('connect', function() {
        socket.write(CONN_OK + CRLF + PROXY_AGENT + END_LF);
    });

    proxy.on( 'data', function(d) {
        socket.write(d)
    });
    
    socket.on('data', function(d) {
        try {
            proxy.write(d)
        } catch(err) {
            // do nothing here ..
        }
    });

    // have some neat logic here ..
    proxy.on( 'end',  function()  {
        socket.end()
    });
    
    socket.on('end',  function()  {
        proxy.end()
    });

    proxy.on( 'close',function()  {
        socket.end()
    });
    
    socket.on('close',function()  {
        proxy.end()
    });

    proxy.on( 'error',function()  {
        socket.end()
    });
    
    socket.on('error',function()  {
        proxy.end()
    });
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
/**
 * Expose config as globals
 * for example `redishost` etc.
 */
exports.configParser = function() {
    for (var key in config) {
        Object.defineProperty(
            global
          , key
          , Object.getOwnPropertyDescriptor(config, key));
    }
}

/**
 * [parse the request protocol.
 *  By default, give Http. Right now,
 *  we support only Http, Https]
 * @param  {[protocol]} a        [url parsed protocol]
 * @return {[http Object]}       [http/https Object]
 */
exports.parseProtocol = function(a) {
    return "http:" === a ? http:
        "https:" === a ? https:
            http;
};

/**
 * [buildRequest, for https Incoming
 *  Connections, on Sockets]
 * @param  {[http Request]} request
 */
exports.buildRequest = function(request) {
    return ('https://' + request.headers.host + request.url);
}

/**
 * [parse httpIncomingRequest, to get
 *  original complete Client Request]
 * @param  {[http Request]} request
 */
exports.parseRequest = function(request) {
    var creq = url.parse(request.url);
    creq.protocol = this.parseProtocol(creq.protocol);
    creq.port = creq.protocol == https
        ? creq.port ? creq.port : 443
        : creq.port ? creq.port : 80;
    creq.method   = request.method;
    creq.headers  = request.headers;
    delete creq.headers.host;
    return creq;
}

/**
 * [parse _options for creating httpRequest]
 * @param  {[http Request]} request
 * @return {[Object]}
 */
exports.getOptions = function(request) {
    /**
     * request.path = pathname + querystring
     * @see [http://nodejs.org/api/url.html]
     */
    return {
        host    : request.hostname,
        port    : request.port,
        method  : request.method,
        headers : request.headers,
        path    : request.path
    };
}

/**
 * [createTargetRequest with the options from
 *     incomingHttpRequest, after looking up in
 *     Redis with the Hash]
 *     
 * @param  {[http Incoming Proxy Request]}     req
 * @param  {[httpOptions]}                     _options
 * @param  {[client Original Request]}         creq
 * @param  {[http Outgoing Proxy Response]}    res
 * @param  {[md5-hash]}                        hash
 * @param  {[Buffer]}                          buffer
 */
exports.createTargetRequest = function(req, _options, creq, res, hash, buffer) {
    /**
     * create the targetRequest, with the incoming options
     */
    var targetRequest;

    if (creq.method === 'GET') {
        targetRequest = creq.protocol[_options.method.toLowerCase()](_options);
    } else {
        targetRequest = creq.protocol.request(_options);
    }

    /**
     * [Listen for httpErrors, and handle appropriately]
     */
    targetRequest.on('error', function(err) {
        utils.proxyError(err, res);
    });
    
    /**
     * [we listen to response event, for a targetRequest
     *  and appropriately, pipe the response to the
     *  original sender]
     *  
     * @param  {[Event]}    response        [http response event]
     * @param  {[response]} targetResponse  [http response message]
     */
    targetRequest.on('response', function (targetResponse) {
        /**
         * @todo [vary: headers]
         * split on delimiter, and remove
         * these headers, before storing.
         * what else needs to be done ?
         */
        targetResponse.pipe(res);
        var responseBody = [];
        
        targetResponse.on('data', function(chunk) {
            responseBody.push(new Buffer(chunk));
        })

        targetResponse.on('end', function() {
            responseBody = Buffer.concat(responseBody);
            /**
             * [transfer-encoding: chunked]
             * @see [http://en.wikipedia.org/wiki/Chunked_transfer_encoding]
             */
            try {
                if (targetResponse.headers['transfer-encoding'].toLowerCase() === 'chunked') {
                    delete targetResponse.headers['content-length'];
                }
            } catch (e) {
                // do nothing here ..
            }

            /**
             * [content-encoding: gzip, deflate]
             * we do not support `sdch` yet !!
             * @see [http://en.wikipedia.org/wiki/HTTP_compression]
             */
            switch (targetResponse.headers['content-encoding']) {
                case 'gzip':
                    zlib.unzip(responseBody, function(err, buffer) {
                        if (!err) {
                            responseBody = buffer;
                            redis.hmset(hash, 'body', responseBody.toString(),
                                'headers', JSON.stringify(targetResponse.headers), 'code', targetResponse.statusCode);
                        }
                    }); break;
                case 'deflate':
                    zlib.inflate(responseBody, function(err, buffer) {
                        if (!err) {
                            responseBody = buffer;
                            redis.hmset(hash, 'body', responseBody.toString(),
                                'headers', JSON.stringify(targetResponse.headers), 'code', targetResponse.statusCode);
                        }
                    }); break;
                default:
                    redis.hmset(hash, 'body', responseBody.toString(),
                        'headers', JSON.stringify(targetResponse.headers), 'code', targetResponse.statusCode);
                    break;
            }
        })
        
        res.writeHead(targetResponse.statusCode, targetResponse.headers);
    });

    /**
     * here is the magic, happening
     */
    if (datamethods.test(creq.method)) {
        targetRequest.write(buffer);
    } else {
        req.pipe(targetRequest);
    }

    targetRequest.end();
}

/**
 * [Lookup Redis, with URI, Buffer to see,
 *  if we have already captured this request.
 *  Otherwise, route it to the original Backend.]
 * @param  {[http Incoming Proxy Request]}     req
 * @param  {[httpOptions]}                     _options
 * @param  {[client Original Request]}         creq
 * @param  {[http Outgoing Proxy Response]}    res
 * @param  {[Buffer]}                          buffer
 */
exports.redisLookUp = function(req, _options, creq, res, buffer) {
    /**
     * @todo [construct uri + buffer with regex,
     * based on x-respond-with in request header]
     */
    var uri    = req.url;
    var buffer = typeof buffer === 'undefined' ? '' : buffer;
    var hash   = md5(uri + buffer);

    /**
     * @todo [cache-control]
     * if not ((cachecontrol.test(req.headers.pragma)) || (cachecontrol.test(req.headers['cache-control'])))
     * then do redis, else not.
     */
    redis.hgetall(hash, function(err, r) {
        if (r != null) {
            /**
             * @todo [content-encoding: gzip, deflate]
             */
            var body = r.body;
            var statusCode = r.code;
            var replyHeaders = JSON.parse(r.headers);
            res.writeHead(statusCode, replyHeaders);
            res.end(body);
        } else {
            utils.createTargetRequest(req, _options, creq, res, hash, buffer);
        }
    });
}

/**
 * [proxy Incoming httpRequest]
 * @param  {[http Incoming Proxy Request]}    req
 * @param  {[http Options]}                   _options
 * @param  {[client Original Request]}        creq
 * @param  {[http Outgoing Proxy Response]}   res
 */
exports.proxyRequest = function(req, _options, creq, res) {
    /**
     * [implement buffer data for POST & PUT here]
     * events are: data, close, end: we need to
     * listen to only 'data' `event` and destroy
     * the connection, if buffer exceeds 4096 bytes
     * 
     * @todo [add req.headers to md5-hash]
     */
    var buffer = '';
    if (datamethods.test(creq.method)) {
        req.on('data', function(chunk) {
            buffer += chunk;
            if (buffer.length > MAX_BUFF_LIMIT) {
                req.connection.destroy();
            }
        });

        /**
         * we listen to `end` event, to compute the entropy
         * with the post'ed data. we also check for buffer
         * overloads, and destroy the connection.
         */
        req.on('end', function () {
            utils.redisLookUp(req, _options, creq, res, buffer);
        });
    } else {
        this.redisLookUp(req, _options, creq, res)
    }
}

/**
 * [start proxyServer & others if any]
 * @param  {[httpServers Array]} servers
 */
exports.startServers = function(servers) {
    servers.forEach(function(server) {
        try {
            server.listen(server.port, function () {
                log.info(server.name + " started, listening on port: " + server.port);
            });
        } catch (e) {
            log.info(e);
            if (e.code === 'EADDRINUSE') {
                log.error('Another process is listening on port: ' + server.port
                    + ' for Server: ' + server.name);
            }
        };
    });
}

/**
 * [httpServer errorHandler]
 * @param  {[httpServers Array]} servers
 */
exports.errorHandler = function(servers) {
    servers.forEach(function(server) {
        server.on('error', function(err) {
            if (err.code === 'EADDRINUSE') {
                log.error('Another process is listening on port: ' + server.port
                    + ' for Server: ' + server.name);
            } else {
                log.error(err);
            }
        });
    });
}

/**
 * [Listen for proxyError]
 * @param  {[httpError]} err
 * @param  {[http Outgoing Proxy Response]} res
 */
exports.proxyError = function(err, res) {
    /**
     * Error Codes
     * @see [https://github.com/joyent/libuv/blob/master/include/uv.h#L69]
     */
    if (err.code === 'ENOTFOUND') {
        res.writeHead(404);
        res.end('Not Found');
    } else {
        res.writeHead(500);
        res.end('Internal Server Error');
        log.error(err.message);
    }
}

/**
 * [Listener for Redis Errors]
 * @param  {[Redis errorObject]} err
 */
exports.redisError = function(err) {
    log.error(err.message);
    log.error('Shutting down Proxy ..');
    utils.closeServers();
}

/**
 * [cleanup signal handler, closes servers,
 *  Redis, and does cleanup actions, if any]
 */
exports.closeServers = function() {
    servers.forEach(function(server) {
        if (server != null) {
            log.info('SIGTERM received, closing server: ' + server.name);
            server.close();
        }
    });

    log.info('ProxyServer closed ..');
    redis.quit();
    process.exit();
}
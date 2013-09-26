var config = {};

config.proxyserverport  = 3000,
config.owlserverport    = 3001,
config.MAX_BUFF_LIMIT   = 4096,
config.datamethods      = new RegExp('PUT|POST', 'i');
config.cachecontrol     = new RegExp('no-cache', 'i');

config.redishost        = '127.0.0.1';
config.redisport        = '6379';
config.rediskey         = 'STUB::';
config.LOCAL_HOST       = '127.0.0.1';
config.CRLF             = '\r\n';
config.END_LF           = new Array(3).join(config.CRLF);
config.CONN_OK          = 'HTTP/1.0 200 Connection established';
config.PROXY_AGENT      = 'Proxy-agent: Owl-Server/1.1';

config.https_options = {
    key: fs.readFileSync(__dirname + '/../certs/key.pem'),
    cert: fs.readFileSync(__dirname + '/../certs/cert.pem')
};

module.exports = config;
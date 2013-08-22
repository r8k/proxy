var config = {};

config.proxyserverport	= 3000,
config.testserverport   = 8080,
config.MAX_BUFF_LIMIT   = 4096,
config.datamethods      = new RegExp('PUT|POST', 'i');
config.cachecontrol     = new RegExp('no-cache', 'i');

config.redishost        = '127.0.0.1';
config.redisport        = '6379';
config.rediskey         = 'STUB::';

module.exports = config;
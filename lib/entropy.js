/**
 * [entropy function, to get md5, hex digest]
 * @param  {[String]} i     [anything, to get crypted]
 * @return {[md5, hex]}     [md5, hex digest]
 * 
 * @todo [re-write this in core-v8]
 */
var md5 = function(i) {
    return (rediskey + crypto.createHash('md5').update(i).digest('hex'));
};

module.exports = md5;
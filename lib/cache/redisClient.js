var Redis = require('ioredis');
var db_url = require('../../config.js').redis_url;
var config = require('../../config.js');
var enable_cache = config.enable_cache;
var redis = enable_cache ? (config.enable_redis_cluster ? new Redis.Cluster(config.redis_cluster): new Redis(db_url)) : null;

if (enable_cache) {
	redis.on('error', function(error) {
		console.log('Conncetion for redis error!');
		console.log(error);
	});
}


module.exports = redis;
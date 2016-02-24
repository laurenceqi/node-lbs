var redis = require('./redisClient');

function get(key, cb) {
    redis.get(key, cb);
}

function set(key, value, ttl) {
    redis.set(key, value);
    redis.expire(key, ttl);
}

function rpush(key, list, ttl) {
    redis.rpush(key, list);
    redis.expire(key, ttl);
}

function lrange(key, start, stop, cb) {
    redis.lrange(key, start, stop, cb);
}

function exists(key, cb) {
    redis.exists(key, cb);
}


function setnx(key, value, ttl, cb) {
    redis.setnx(key, value, function(err, result){
        if(err) return cb(err);
        if(result == 1) {  // not exists, set successfully
            redis.expire(key, ttl);
            cb(null, true);
        } else { //exists, not set
            cb(null, false);
        }
    });
}

//public
module.exports.get = get;
module.exports.set = set;
module.exports.rpush = rpush;
module.exports.lrange = lrange;
module.exports.exists = exists;
module.exports.setnx = setnx;
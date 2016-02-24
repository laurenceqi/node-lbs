var cache = require('../../lib/cache/cache');
var geohash = require('ngeohash');
var logger = require('../../log');
var util = require('../../util');


function queryBuilder(query) {
    var result = {
        bool: {
            must: [],
            must_not: []
        }
    };
    for (var q in query) {
        if (typeof query[q] == 'object') {
            if ('ne' in query[q]) {
                r = {
                    term: {}
                }
                r.term[q] = query[q].ne;
                result.bool.must_not.push(r);
            } else {
                r = {
                    range: {}
                }
                r.range[q] = query[q];
                result.bool.must.push(r);
            }
        } else {
            r = {
                term: {}
            }
            r.term[q] = query[q];
            result.bool.must.push(r);
        }
    }
    return result;
}

function getCountFromCache(getResultCount, geohash, precision, longitude, latitude, cb) {
    var _geohash = geohash.slice(0, precision);
    cache.get(_geohash, function(err, result) {
        if (err) return util.onerror(err, cb);
        if (result == null) {
            getResultCount(longitude, latitude, precision, function(err, count) {
                if (err) return cb(err, null);
                cache.set(_geohash, count, 300);
                cb(null, count)
            });
        } else {
            cb(null, result);
        }
    });
}

// geohash length   width   height
// 1   5,009.4km   4,992.6km
// 2   1,252.3km   624.1km
// 3   156.5km 156km
// 4   39.1km  19.5km
// 5   4.9km   4.9km
// 6   1.2km   609.4m
// 7   152.9m  152.4m
// 8   38.2m   19m
// 9   4.8m    4.8m
// 10  1.2m    59.5cm
// 11  14.9cm  14.9cm
// 12  3.7cm   1.9cm
function getPrecisionFromCacheFunc(getResultCount) {

    return function(longitude, latitude, distance, resultNo, cb) {
        // 默认精度6 ~ 1.2km x 0.61km
        if (distance <= 1000) {
             cb(null, String(distance) + 'm');
        } else if (distance <= 5000) {
            var ghash = geohash.encode(latitude, longitude);
            getCountFromCache(getResultCount, ghash, 5, longitude, latitude, function(err, count) {
                if (count < resultNo * 10) {
                    cb(null, 5);
                } else {
                    getCountFromCache(getResultCount, ghash, 6, longitude, latitude, function(err, count){
                        if (count < resultNo * 10) {
                            cb(null, 5);
                        } else {
                            cb(null, 6);
                        }
                    });
                }
            });
        } else {
            var ghash = geohash.encode(latitude, longitude);
            getCountFromCache(getResultCount, ghash, 5, longitude, latitude, function(err, count) {
                if (count < resultNo * 10) {
                    cb(null, String(distance) + 'm');
                } else {
                    getCountFromCache(getResultCount, ghash, 6, longitude, latitude, function(err, count){
                        if (count < resultNo * 10) {
                            cb(null, 5);
                        } else {
                            cb(null, 6);
                        }
                    });
                }
            });
        }
    };
}


//public
module.exports.queryBuilder = queryBuilder;
module.exports.getPrecisionFromCacheFunc = getPrecisionFromCacheFunc;
var client = require('./client');
var util = require('../../util');
var config = require('../../config');
var logger = require('../../log');
var esUtil = require('./util');
var cache = require('../../lib/cache/cache');
var geohash = require('ngeohash');

/**
 * 对对象生成hash字符串
 * @param  {Object} object to generate hash
 * @return {String} hash
 */
function generateObjectHash(user_info) {
    var hash = '';
    var keys = Object.keys(user_info);
    keys.sort();
    // logger.debug(JSON.stringify(keys));
    for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        hash = hash + ':' + key;
        if (typeof user_info[key] == 'object') {
            var _keys = Object.keys(user_info[key]);
            _keys.sort();
            // logger.debug(_keys);
            for (var j = 0; j < _keys.length; j++) {
                _key = _keys[j];
                hash = hash + ':' + _key + ':' + user_info[key][_key];
            }
        } else {
            hash = hash + ':' + user_info[key];
        }
    }
    return hash;
}

//构造es请求body
function getQueryBody(index, longitude, latitude, precision, startRow, limit, user_info) {
    var filter = esUtil.queryBuilder(user_info);
    // logger.debug(JSON.stringify(filter));
    filter.bool.must.unshift({
        range: {
            create_date: {
                gte: "now-" + config.user_data_valid_time + "s"
            }
        }
    });

    filter.bool.must.push({
        geohash_cell: {
            pos: [longitude, latitude],
            precision: precision,
            neighbors: true
        }
    });

    if (filter.bool.must.length == 0) delete filter.bool.must;
    if (filter.bool.must_not.length == 0) delete filter.bool.must_not;
    var now = new Date();
    var searchBody = {
        index: now.getTime() - (new Date(now.toISOString().substring(0, 10) + ' 00:00:00')).getTime() > config.user_data_valid_time * 1000 ? "<" + index + "-{now/d}>" : "<" + index + "-{now-1d/d}>",
        type: index,
        body: {
            from: startRow,
            size: limit + 1,
            query: {
                bool: {
                    filter: filter
                }
            },
            sort: [{
                _geo_distance: {
                    pos: [longitude, latitude],
                    order: "asc",
                    unit: "m",
                    mode: "min",
                    distance_type: "plane"
                }
            }]
        }
    };
    return searchBody;
}

function changePrecison(searchbody, precision) {
    var mustArray = searchbody.body.query.bool.filter.bool.must;
    var geoCell = mustArray[mustArray.length - 1];
    geoCell.geohash_cell.precision = precision;
}

/**
 * query result from elastic
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
function queryFromElastic(index, longitude, latitude, distance, startRow, limit, user_info, cb) {

    if (distance > config.max_distance) {
        return util.onerror(new Error('Exceed max distance'), cb);
    }

    if (startRow + limit > config.max_userno) {
        return util.onerror(new Error('Exceed max user number'), cb);
    }

    //从精度6开始往低精度回溯，直到结果集满足数目
    var topPrecision;
    if (distance <= 600) {
        topPrecision = 6;
    } else if (distance <= 5000) {
        topPrecision = 5;
    } else if (distance <= 50000) {
        topPrecision = 4;
    } else {
        topPrecision = 3;
    }

    var searchBody = getQueryBody(index, longitude, latitude, 6, startRow, limit, user_info);
    logger.debug(JSON.stringify(searchBody));
    client.search(searchBody, function(err, res) {
        if (err) return util.onerror(err, cb);
        logger.debug(JSON.stringify(res));
        if (res.hits.hits.length > limit || 6 == topPrecision) {
            result = [];
            res = res.hits.hits;
            cb(null, res);
        } else {
            changePrecison(searchBody, 5);
            logger.debug(JSON.stringify(searchBody));
            client.search(searchBody, function(err, res) {
                if (err) return util.onerror(err, cb);
                logger.debug(JSON.stringify(res));
                if (res.hits.hits.length > limit || 5 == topPrecision) {
                    result = [];
                    res = res.hits.hits;
                    cb(null, res);
                } else {
                    changePrecison(searchBody, 4);
                    logger.debug(JSON.stringify(searchBody));
                    client.search(searchBody, function(err, res) {
                        if (err) return util.onerror(err, cb);
                        logger.debug(JSON.stringify(res));
                        if (res.hits.hits.length > limit || 4 == topPrecision) {
                            result = [];
                            res = res.hits.hits;
                            cb(null, res);
                        } else {
                            changePrecison(searchBody, 3);
                            logger.debug(JSON.stringify(searchBody));
                            client.search(searchBody, function(err, res) {
                                if (err) return util.onerror(err, cb);
                                logger.debug(JSON.stringify(res));
                                result = [];
                                res = res.hits.hits;
                                cb(null, res);
                            });
                        }
                    });
                }
            });
        }
    });
}

/**
 * get user from cache
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
function getFromCache(index, longitude, latitude, distance, startRow, limit, user_info, cb) {
    var hashWithoutPage = index + ':' + geohash.encode(latitude, longitude, 6) + ':' + String(distance) + ':' + generateObjectHash(user_info);
    hash = hashWithoutPage + ':' + String(startRow) + ':' + String(limit);
    logger.debug('HASH:' + hash);
    if (startRow != 0) startRow++; //假定用户自己出现在第一分页，去除分页用户重复现象
    //前5分页一次性拉取，后续分页单页拉取
    if (startRow + limit <= limit * 5 + 1) {
        cache.exists(hashWithoutPage, function(err, result) {
            if (err) return util.onerror(err, cb);
            if (result == 0) { //cache miss
                logger.debug('Cache Miss: ' + hashWithoutPage + ' JSON::' + result);

                //lock for write
                cache.setnx('lock:' + hashWithoutPage, 1, config.cache_ttl, function(err, isSet) {
                    if (err) return util.onerror(err, cb);
                    if (isSet) { //get lock
                        logger.debug('get write lock, ready to write');
                        queryUserFromElastic(longitude, latitude, distance, 0, limit * 5 + 1, user_info, function(err, res) {
                            if (err) return util.onerror(err, cb);

                            var page = res.slice(startRow, startRow + limit + 1);
                            cb(null, page);
                            if (res.length > 0) {
                                var cacheArray = [];
                                for (var i = 0; i < res.length; i++) {
                                    cacheArray.push(JSON.stringify(res[i]));
                                }
                                cache.rpush(hashWithoutPage, cacheArray, config.cache_ttl);
                            }
                        });
                    } else { //not get lock, wait 500ms for read
                        logger.debug("Not get write lock, wait for read from cache");
                        setTimeout(function() {
                            cache.lrange(hashWithoutPage, startRow, startRow + limit, function(err, result) {
                                if (err) return util.onerror(err, cb);
                                var res = [];
                                for (var i = 0; i < result.length; i++) {
                                    res.push(JSON.parse(result[i]));
                                }
                                cb(null, res);
                            });
                        }, 500);
                    }
                });
            } else { // 命中缓存
                logger.debug('HIT Cache: ' + hashWithoutPage + ' JSON::' + result);
                cache.lrange(hashWithoutPage, startRow, startRow + limit, function(err, result) {
                    if (err) return util.onerror(err, cb);
                    var res = [];
                    for (var i = 0; i < result.length; i++) {
                        res.push(JSON.parse(result[i]));
                    }
                    cb(null, res);
                });
            }
        });
    } else { //第6页及后续分页
        cache.get(hash, function(err, result) {
            if (err) return util.onerror(err, cb);
            if (result == null) {
                logger.debug('Cache Miss: ' + hash + ' JSON::' + result);

                //lock for write
                cache.setnx('lock:' + hash, 1, config.cache_ttl, function(err, isSet) {
                    if (err) return util.onerror(err, cb);
                    if (isSet) { //get lock
                        logger.debug('get write lock, ready to write');
                        queryUserFromElastic(longitude, latitude, distance, startRow, limit, user_info, function(err, res) {
                            if (err) return util.onerror(err, cb);
                            cache.set(hash, JSON.stringify(res), config.cache_ttl);
                            cb(null, res);
                        });
                    } else { //not get lock, wait 500ms for read
                        logger.debug("Not get write lock, wait 500ms for read from cache");
                        setTimeout(function() {
                            cache.get(hash, function(err, result) {
                                if (err) return util.onerror(err, cb);
                                var res = JSON.parse(result);
                                if (res == null) res = [];
                                cb(null, res);
                            });
                        }, 500);
                    }
                });
            } else {
                logger.debug('HIT Cache: ' + hash + ' JSON::' + result);
                var res = JSON.parse(result);
                cb(null, res);
            }
        });
    }
}

/**
 * 数据库结果处理，去掉self_id, 确保返回的结果集数目正确
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
function postProcess(res, self_id, limit, cb) {
    result = [];
    for (var i = 0; i < res.length; i++) {
        res[i]._source.distance = res[i].sort[0];
        if (self_id == null || res[i]._source.user_id !== self_id) {
            result.push(res[i]._source);
        }
    }
    if (result.length == limit + 1) result.pop();
    cb(null, result);
}

/**
 * 查询接口处理函数
 * @param  {double} longitude
 * @param  {double}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {[type]}
 * @param  {Function}
 * @return {[type]}
 */
function search(index, longitude, latitude, distance, startRow, limit, user_info, cb) {
    var self_id = null;
    if (user_info.id !== undefined && user_info.id.ne !== undefined) {
        self_id = user_info.id.ne;
        delete user_info.id;
    }

    if (config.enable_cache) { // cahce enabled
        getFromCache(index, longitude, latitude, distance, startRow, limit, user_info, function(err, res) {
            if (err) return util.onerror(err, cb);
            postProcess(res, self_id, limit, cb);
        });
    } else {
        // cache unabled
        queryFromElastic(index, longitude, latitude, distance, startRow, limit, user_info, function(err, res) {
            if (err) return util.onerror(err, cb);
            postProcess(res, self_id, limit, cb);
        });
    }
}

module.exports.search = search;
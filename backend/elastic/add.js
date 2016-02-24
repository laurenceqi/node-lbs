var client = require('./client');
var util = require('../../util');
var config = require('../../config');
var logger = require('../../log');


var batch_queue = [];
var last_bulk_time = Date.now();

//用户数据上报函数
function insert_data(index, body, cb) {
    body.create_date = new Date().getTime();
    body.pos = [body.longitude, body.latitude];
    delete body.longitude;
    delete body.latitude;

    // 将请求写入队列，等待批量处理 
    batch_queue.push({
        update: {
            _id: util.zeropadding(body.id)
        }
    });
    batch_queue.push({
        doc: body,
        doc_as_upsert: true
    });
    logger.debug("Push to Batch Queue " + batch_queue.length);

    //batch process
    if (batch_queue.length == config.elastic_bulk_batch || (Date.now() - last_bulk_time) > config.bulk_timeout) {
        var old_batch_queue = batch_queue;
        var now = new Date();
        batch_queue = [];
        last_bulk_time = Date.now();

        client.bulk({
            body: old_batch_queue,
            index: "<" + index + "-{now/d}>",
            type: index
        }, function(err, resp) {
            if (err) return util.onerror(err, cb);
            if (resp.errors) return util.onerror(new Error(JSON.stringify(resp)), cb);
            logger.info("Batch complete! " + JSON.stringify(old_batch_queue));
            //为了保证换日index中无重复数据，换日数据有效时间段内同时写今天和昨天的index
            if (now.getTime() - (new Date(now.toISOString().substring(0, 10) + ' 00:00:00')).getTime() < config.user_data_valid_time * 1000) {
                client.bulk({
                    body: old_batch_queue,
                    index: "<" + index + "-{now-1d/d}>",
                    type: index
                }, function(err, resp) {
                    if (err) return util.onerror(err, cb);
                    if (resp.errors) return util.onerror(new Error(JSON.stringify(resp)), cb);
                    logger.info("Batch complete! " + JSON.stringify(old_batch_queue));
                    cb(null);
                });

            } else {
                cb(null);
            }
        });
    } else {
        cb(null);
    }
}

module.exports.add = insert_data;
var amqp = require('amqplib/callback_api');
var util = require('./util');
var logger = require('./log');
var config = require('./config');

var status = {
    sendCount: 0,
    consumeCount: 0
};

if (config.enable_mq) {

    var prepareMQ = function(cb) {
        console.log("Queue Enabled");
        amqp.connect(config.mq_url, function(err, conn) {
            if (err) return util.onerror(err, cb);
            conn.createChannel(function(err, ch) {
                if (err) return util.onerror(err, cb);
                var q = 'task_queue';
                ch.assertQueue(q, {
                    durable: true
                }, function(err) {
                    if (err) return util.onerror(err, cb);
                    var msgId = 0;

                    var sendMessage = function(msg) {
                        msg.msgId = msgId++;
                        ch.sendToQueue(q, util.encapsulateRequest(msg));
                        logger.info("[<<] Sent Msg NO:%d '%s'", msg.msgId, msg);
                        status.sendCount++;
                    };
                    module.exports.sendMessage = sendMessage;

                    ch.prefetch(config.mq_prefetch);

                    var consumeMessage = function(processCb, cb) {
                        ch.consume(q, function(msg) {
                            var msgBuffer = msg.content;
                            var reqest = util.unencapsulateRequest(msgBuffer);
                            logger.info("[>>] Received %s", msgBuffer.toString());
                            status.consumeCount++;

                            if (config.mq_ack_enabled) {
                                var ackMsg = function(msg, msgId) {
                                    logger.info("[==] MSG %d Done", msgId);
                                    ch.ack(msg);
                                };
                            } else {
                                var ackMsg = function(msg, msgId) {
                                    logger.info("[==] MSG %d Done", msgId);
                                };
                            }
                            processCb(reqest, msg, ackMsg);
                        }, {
                            noAck: !config.mq_ack_enabled
                        }, function(err, ok) {
                            if (err) return util.onerror(err, cb);
                            cb();
                        });
                    };
                    module.exports.consumeMessage = consumeMessage;
                    cb(null);
                });
            });
        });
    };
    module.exports.prepareMQ = prepareMQ;
} else {
    var msgId = 0;
    var processor = require('./msgprocessor');

    var prepareMQ = function(cb) {
        console.log("Queue Not Enabled!");
        var receiveMsg = function(msg) {
            var msgBuffer = msg.content;
            var reqest = util.unencapsulateRequest(msgBuffer);
            logger.info("[>>] Received %s", msgBuffer.toString());

            var ackMsg = function(msg, msgId) {
                console.log("[==] MSG %d Done", msgId);
            };
            processor.processRequest(reqest, msg, ackMsg);
        };

        var sendMessage = function(msg) {
            msg.msgId = msgId++;
            logger.info("[<<] Sent Msg NO:%d '%s'", msg.msgId, msg);
            receiveMsg({
                content: util.encapsulateRequest(msg)
            });
        };
        module.exports.sendMessage = sendMessage;

        var consumeMessage = function() {
            console.log("Queue Not Enabled. No Need For worker!");
            process.exit(0);
        };
        module.exports.consumeMessage = consumeMessage;

        cb(null);
    };
    module.exports.prepareMQ = prepareMQ;
}

module.exports.status = status;
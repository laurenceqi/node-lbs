var processor = require('./msgprocessor');
var logger = require('./log');
var mq = require('./queue');
var util = require('./util');


mq.prepareMQ(function(err) {
    if (err) util.onerror(err);
    console.log("prepareMQ Done!");
    mq.consumeMessage(processor.processRequest, function(err) {
        if (err) util.onerror(err);
        console.log("Worker is ready!");
    });
});



var add = require('./backend')('add');
var _delete = require('./backend')('delete');
var search = require('./backend')('search');
var util = require('./util');

var object = {
    add: add,
    delete: _delete,
    search: search
};

function processRequest(request, msg, ackMsg) {
    function onerr(err) {
        if (err) util.onerror(err);
        ackMsg(msg, request.msgId);
    }
    request.args.push(onerr);
    var callee = object[request.object];
    callee[request.method].apply(callee, request.args);
}

module.exports.processRequest = processRequest;
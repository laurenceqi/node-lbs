var logger = require('./log');

function convertQuery(query) {
    if (query && typeof query == 'object') {
        convertedQuery = {};
        for (var prop in query) {
            convertedQuery['$' + prop] = query[prop];
        }
        return convertedQuery;
    }
    return query;
}

function encapsulateRequest(request) {
    var requestJson = JSON.stringify(request);
    return new Buffer(requestJson);
}

function unencapsulateRequest(requestBuffer) {
    var requestJson = requestBuffer.toString();
    var request = JSON.parse(requestJson);
    return request;
}

function distance(lon1, lat1, lon2, lat2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;

    return 12742000 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

function onerror(err, cb) {
    logger.error('Error ', err.stack);
    if (cb) cb(err);
}

function getUsersShardKey(longtitude, latitude) {
    return Math.floor(longtitude) * 1000 + Math.floor(latitude);
}

function getShardKey(longtitude, latitude) {
    return Math.floor(latitude / 5) * 5;
}

function zeropadding(id) {
    return ("0000000000000000" + String(id)).slice(-16); 
}

module.exports.convertQuery = convertQuery;
module.exports.distance = distance;
module.exports.encapsulateRequest = encapsulateRequest;
module.exports.unencapsulateRequest = unencapsulateRequest;
module.exports.onerror = onerror;
module.exports.getShardKey = getShardKey;
module.exports.getUsersShardKey = getUsersShardKey;
module.exports.zeropadding = zeropadding;
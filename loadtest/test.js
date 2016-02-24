var request = require('request');
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var should = require('should');

var base_url = ['http://localhost:8000', 'http://localhost:8001', 'http://localhost:8002'];
var mongo_url = 'mongodb://localhost:27017/qianbao';

var runTimes = 101;
var i = 0;
var getBaseUrl = function(){
    i++;
    return base_url[i % base_url.length];
};


/*
upload_user_data
*/
var upload_url = "/upload_user_data";

var upload_user = function(i, user_id, city, longitude, latitude, user_info, cb) {
    if (typeof user_id == 'function') cb = user_id, user_id = undefined;
    var post_data = {
        'user_id': _.isUndefined(user_id) ? i : user_id,
        'city': _.isUndefined(city) ? _.sample(['Shanghai', 'Beijing', 'Nanjing', 'Wulumuqi', 'Lasa'], 1) : city,
        'longitude': _.isUndefined(longitude) ? 73 + _.random(0, 1, true) : longitude,
        'latitude': _.isUndefined(latitude) ? 4 + _.random(0, 1, true) : latitude,
        'user_info': {
            'sex': _.isUndefined(user_info) || _.isUndefined(user_info.sex) ? _.random(1) : user_info.sex,
            'age': _.isUndefined(user_info) || _.isUndefined(user_info.age) ? _.random(1, 100) : user_info.age
        }
    };

    request.post({
        url: getBaseUrl() + upload_url,
        body: post_data,
        json: true
    }, function(err, response, body) {
        if (err) return cb(err);
        //  console.log('\r\nNO:' + i + ' \r\npost_data: \r\n' + JSON.stringify(post_data) + ' \r\nbody:\r\n' + JSON.stringify(body));
        cb();
    });

};



/*
/delete_user_data
*/
var delete_url = '/delete_user_data';
var delete_user = function(i, user_id, city, cb) {

    var delete_post = {
        user_id: user_id,
        city: city
    };

    request.post({
        url: base_url + delete_url,
        body: delete_post,
        json: true
    }, function(err, response, body) {
        if (err) return cb(err);
        //console.log('\r\nNO:' + i + ' \r\npost_data: \r\n' + JSON.stringify(delete_post) + ' \r\nbody:\r\n' + JSON.stringify(body));
        cb();
    });
};
module.exports.delete_user = delete_user;

/*
 *  search test
 */
var search_url = '/search_nearby_users';
var search_user = function(i, cb) {
    var search_data = {
        city: 'Shanghai',
        'longitude': 73 + _.random(0, 1, true),
        'latitude': 4+ _.random(0, 1, true),
        'distance': 10000000000000,
        'page_no': 1,
        'page_size': 20,
        user_info: {
            age: {
                gt: 0,
                lt: 100
            }
        }
    };

    request.post({
        url: getBaseUrl() + search_url,
        body: search_data,
        json: true
    }, function(err, response, body) {
        if (err) return cb(err);
        //    console.log('\r\nNO:' + i + ' \r\npost_data: \r\n' + JSON.stringify(search_data) + ' \r\nbody:\r\n' + JSON.stringify(body));
        cb(null, body);
    });
};

console.log("StartTime:" + new Date().toTimeString());
var EventEmitter = require('events');
var emitter = new EventEmitter.EventEmitter();
var j = 0;

emitter.on("consumed", function() {
    j++;
    if (j % 10000 == 0) {
        console.log("upload " + j.toString() + " " + new Date().toTimeString());
    }

    upload_user(j, function(err) {
        emitter.emit("consumed");
    });

})

for (var i = 0; i < 1000; i++) {
    j++;
    upload_user(j, function(err) {
        if (err) return console.log(err.stack);
        emitter.emit("consumed");
    });
}

var jj = 0;

emitter.on("sconsumed", function() {
    jj++;
    if (jj % 10000 == 0) {
        console.log('Search ' + jj.toString() + " " + new Date().toTimeString());
    }
    search_user(j, function(err) {
        emitter.emit("sconsumed");
    });

})

// for (var i = 0; i < 1000; i++) {
//     jj++;
//     search_user(j, function(err) {
//         emitter.emit("sconsumed");
//     });
// }
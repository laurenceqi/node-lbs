var express = require('express');
var app = express();
var _delete = require('./backend')('delete');
var search = require('./backend')('search');
var util = require('./util');
var logger = require('./log');
var mq = require('./queue');
var config = require('./config');


mq.prepareMQ(function(err) {
  if (err) return onerror(err);
  console.log("MQ ready!");
});


var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(function(req, res, next) {
  logger.info('Reqest:' + ':[', req.url, '] From [', req.ip, '] with body: ', JSON.stringify(req.body));
  next();
});

/**
 * add a location
 * 
 */
app.post(/^\/(\w+)$/, function(req, res) {

  var body = req.body;
  var index = req.params[0];

  if (body.id === undefined || body.longitude === undefined || body.latitude === undefined) {
    return respond(new Error("Must post id & longitude & latitude param"), res);
  }

  var request = {
    object: 'add',
    method: 'add',
    args: [index, body]
  };
  mq.sendMessage(request);
  respond(null, res, {
    code: 0
  });
});

/**
 * delete a location
 * 
 */
app.delete(/^\/(\w+)\/(\w+)$/, function(req, res) {
  var body = req.body;
  var index = req.params[0];
  var id = req.params[1];

  _delete.delete(index, id, function(err, result) {
    respond(err, res, {
      code: 0,
      count: 1
    });
  });
});

/**
 * search nearby
 * 
 */
app.post(/^\/(\w+)\/_search$/, function(req, res) {
  var body = req.body;
  var index = req.params[0];
  logger.debug(JSON.stringify(body));

  if (body.longitude === undefined || body.latitude === undefined || body.distance === undefined || body.from === undefined || body.size === undefined) {
    return respond(new Error("Must post  body.longitude, body.latitude, body.distance, body.from, body.size param"), res);
  }

  search.search(index, body.longitude, body.latitude, body.distance, body.from, body.size, body.params, function(err, user_list) {
    respond(err, res, {
      code: 0,
      result_list: user_list,
      length: user_list ? user_list.length : 0
    });
  });
});


/**
 * calculate distance between locations
 * 
 */
app.post('/get_distance', function(req, res) {
  var body = req.body;
  status.get_distance_requests++;
  var distance = util.distance(body.lon1, body.lat1, body.lon2, body.lat2);
  respond(null, res, {
    code: 0,
    distance: parseInt(distance)
  });
});



function onerror(err) {
  console.error(err.stack);
  logger.error('Error ', err.stack, err.toString());
}

var respond = function(err, res, result) {
  if (err) {
    logger.error('Error ', err.stack, err.toString());
    res.json({
      code: 1,
      message: err.toString()
    });
  } else {
    logger.info('Response with body: ', JSON.stringify(result));
    res.json(result);
  }
};


var program = require('commander');

program
  .version('0.0.1')
  .option('-p, --port [portnum]', 'listen port', 8000)
  .parse(process.argv);

app.listen(program.port);
console.log(program.port + 'running...');
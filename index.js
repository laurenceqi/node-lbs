var express = require('express');
var app = express();
var user = require('./backend')('user');
var task = require('./backend')('task');
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
  status.totalRequest++;
  var reqid = status.totalRequest;
  logger.info('Reqest:'+ reqid +':[', req.url, '] From [', req.ip, '] with body: ', JSON.stringify(req.body));
  next(); 
});


/**
 * add a location
 * 
 */
app.post(/^\/(\w+)*$/, function(req, res) {

  var body = req.body;
  var index = req.params[0];
  
  if (body.id === undefined || body.longitude === undefined || body.latitude === undefined) {
    return respond(new Error("Must post id & longitude & latitude param"), res);
  }

  var request = {
    object: 'user',
    method: 'insert_user_data',
    args: [body]
  };
  mq.sendMessage(request);
  respond(null, res, {
    code: 0
  });
});


app.post('/delete_user_data', function(req, res) {
  var body = req.body;
  status.delete_user_requests++;
  if (body.user_id === undefined) {
    return respond(new Error("Must post user_id param"), res);
  }

  user.delete_user_data(body.user_id, function(err, result) {
    respond(err, res, {
      code: 0,
      count: 1
    });
  });
});


app.post('/search_nearby_users', function(req, res) {
  var body = req.body;
  status.search_nearby_users_request++;
  logger.debug(JSON.stringify(body));

  if (body.longitude === undefined || body.latitude === undefined || body.distance === undefined || body.page_no === undefined || body.page_size === undefined) {
    return respond(new Error("Must post  body.longitude, body.latitude, body.distance, body.page_no, body.page_size param"), res);
  }

  user.search_users(body.longitude, body.latitude, body.distance, body.page_no, body.page_size, body.user_info, function(err, user_list) {
    respond(err, res, {
      code: 0,
      user_list: user_list,
      length: user_list ? user_list.length : 0
    });
  });
});



app.post('/upload_task_data', function(req, res) {
  var body = req.body;
  status.upload_task_requests++;
  var request = {
    object: 'task',
    method: 'insert_task_data',
    args: [body.task_id, body.valid_from, body.valid_to, body.pos, body.task_info]
  };
  // console.log(JSON.stringify(mq));
  mq.sendMessage(request);
  respond(null, res, {
    code: 0
  });
});


app.post('/delete_task_data', function(req, res) {
  status.delete_task_requests++;
  var body = req.body;
  task.delete_task_data(body.task_id, function(err, result) {
    respond(err, res, {
      code: 0,
      count: null
    });
  });
});


app.post('/delete_tasks', function(req, res) {
  status.delete_tasks_requests++;
  var body = req.body;
  task.delete_tasks(body.task_info, function(err, delete_list) {
    respond(err, res, {
      code: 0,
      task_list: delete_list,
      length: delete_list.length
    });
  });
});


app.post('/search_tasks', function(req, res) {
  var body = req.body;
  status.search_tasks_requests++;
  if (body.longitude === undefined || body.latitude === undefined || body.distance === undefined || body.page_no === undefined || body.page_size === undefined) {
    return respond(new Error("Must post  body.longitude, body.latitude, body.distance, body.page_no, body.page_size param"), res);
  }

  task.search_tasks(body.longitude, body.latitude, body.distance, body.page_no, body.page_size, body.task_info, function(err, task_list) {
    respond(err, res, {
      code: 0,
      task_list: task_list,
      length: task_list.length
    });
  });
});

app.post('/get_distance', function(req, res) {
  var body = req.body;
  status.get_distance_requests++;
  var distance = util.distance(body.lon1, body.lat1, body.lon2, body.lat2);
  //var distance = util.distance(body.longitude1, body.latitude1, body.longitude2, body.latitude2);
  respond(null, res, {
    code: 0,
    distance: parseInt(distance)
  });
});

app.get('/status', function(req, res) {
  res.send(JSON.stringify(status) + JSON.stringify(mq.status));
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
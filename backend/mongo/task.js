var MongoClient = require('mongodb').MongoClient;
var util = require('../../util');
var config = require('../../config');
var _ = require('lodash');
var url = config.db_url;
var logger = require('../../log');

MongoClient.connect(url, function(err, db) {
  if (err) return console.error(err);
  var tasks = db.collection('tasks');

  tasks.ensureIndex({
    'pos': '2dsphere'
  }, function(err, result) {
    if (err) return console.error(err);

    tasks.ensureIndex({
      shardKey: 1,
      task_id: 1
    }, function(err, result) {

      function insert_task_data(task_id, valid_from, valid_to, pos, task_info, cb) {
        var pos_list = {};

        pos.forEach(function(geo_pos) {
          shardKey = util.getShardKey(geo_pos.longtide, geo_pos.latitude);
          if (pos_list[shardKey]) {
            pos_list[shardKey].push([geo_pos.longitude, geo_pos.latitude]);
          } else {
            pos_list[shardKey] = [
              [geo_pos.longitude, geo_pos.latitude]
            ];
          }
        });

        var done = _.after(Object.keys(pos_list).length, cb);

        for (var shardKey in pos_list) {
          var task = {
            create_time: new Date().getTime(),
            valid_from: valid_from,
            valid_to: valid_to,
            pos: {
              type: "MultiPoint",
              coordinates: pos_list[shardKey]
            },
            task_info: task_info
          };

          tasks.findOneAndUpdate({
            task_id: task_id,
            shardKey: parseInt(shardKey)
          }, {
            $set: task
          }, {
            upsert: true
          }, function(err, result) {
            if (err) return onerror(err, cb);
            done();
          });
        }


      }
      module.exports.insert_task_data = insert_task_data;


      function delete_task_data(task_id, cb) {
        tasks.deleteMany({
          task_id: task_id
        }, function(err, results) {
          if (err) return onerror(err, cb);
          cb(null, results);
        });
      }
      module.exports.delete_task_data = delete_task_data;


      function delete_tasks(task_info, cb) {
        var query = {};

        if (task_info) {
          for (var key in task_info) {
            query['task_info.' + key] = util.convertQuery(task_info[key]);
          }
        }

        var delete_list = [];
        tasks.find(query).project({
          'task_id': 1
        }).toArray(function(err, docs) {
          if (err) return onerror(err);
          docs.forEach(function(doc) {
            delete_list.push(doc.task_id);
          });
        });

        tasks.deleteMany(query, function(err, results) {
          if (err) return onerror(err, cb);
          cb(null, delete_list);
        });
      }
      module.exports.delete_tasks = delete_tasks;


      function search_tasks(longitude, latitude, distance, page_no, page_size, task_info, cb) {
        var shardKey = util.getShardKey(longitude, latitude);
        var query = {
          shardKey: shardKey
        };

        if (task_info) {
          for (var key in task_info) {
            query['task_info.' + key] = util.convertQuery(task_info[key]);
          }
        }

        logger.debug('Query: ' + query);

        var cursor = tasks.aggregate([{
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude]
            },
            distanceField: "distance",
            spherical: true,
            //limit: page_no * page_size,
            maxDistance: distance,
            query: {
              shardKey: shardKey
            }
          }
        }, {
          $match: query
        }, {
          $skip: (page_no - 1) * page_size
        }, {
          $limit: page_size
        }]);

        cursor.toArray(function(err, docs) {
          if (err) return onerror(err, cb);

          var task_list = [];
          docs.forEach(function(doc) {
            task_list.push({
              task_id: doc.task_id,
              distance: doc.distance
            });
          });
          cb(null, task_list);
        });
      }
      module.exports.search_tasks = search_tasks;
    });
  });
});

function onerror(err, cb) {
  console.error(err.stack);
  if (cb) cb(err);
}
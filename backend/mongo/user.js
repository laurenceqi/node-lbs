var MongoClient = require('mongodb').MongoClient;
var MongoError = require('mongodb').MongoError;
var config = require('../../config');
var url = config.db_url;
var util = require('../../util');
var logger = require('../../log');

MongoClient.connect(url, function(err, db) {
  if (err) return onerror(err);
  var users = db.collection('users'); //shard key city,user_id
  users.ensureIndex({
    'pos': '2dsphere'
  }, function(err, result) {
    if (err) return onerror(err);
    users.ensureIndex({
      shardKey: 1,
      user_id: 1
    }, function(err, result) {
      if (err) return onerror(err);

      function insert_user_data(body, cb) {
        body.create_time = new Date().getTime();
        body.pos = {
          type: "Point",
          coordinates: [body.longitude, body.latitude]
        };
        var shardKey = util.getUsersShardKey(body.longitude, body.latitude);
        delete body.longitude;
        delete body.latitude;

        if (body.user_info) {
          for (var k in body.user_info) {
            body[k] = body.user_info[k];
          }
          delete body.user_info;
        }
        var user_id = body.user_id;
        delete body.user_id;

        users.findOneAndUpdate({
          shardKey: shardKey,
          user_id: user_id
            // longitude: {
            //   $gte: body.longitude - 2,
            //   $lte: body.longitude + 2
            // },
            // latitude: {
            //   $gte: body.latitude - 2,
            //   $lte: body.latitude + 2
            // }
        }, {
          $set: body
        }, {
          upsert: true
        }, function(err, result) {
          // if (err) {
          //   if (err instanceof MongoError) {
          //     logger.warn("MongoError: RETRY" + err.message);
          //     users.findOneAndUpdate({
          //         user_id: user_id
          //       }, {
          //         $set: body
          //       },
          //       function(err, result) {
          //         logger.debug("second update result");
          //         if (err) return onerror(err, cb);
          //         logger.debug(JSON.stringify(result));
          //         cb(null, result);
          //       });
          //   } else {
          //     return onerror(err, cb);
          //   }
          // }
          if (err) return onerror(err, cb);
          cb(null, result);
        });
      }
      module.exports.insert_user_data = insert_user_data;


      function delete_user_data(user_id, cb) {

        users.deleteMany({
          user_id: user_id,
        }, function(err, result) {
          if (err) return onerror(err, cb);
          cb(null, result);
        });
      }
      module.exports.delete_user_data = delete_user_data;

      /**
       * @param  {[type]}
       * @param  {[type]}
       * @param  {[type]}
       * @param  {[type]}
       * @param  {[type]}
       * @param  {[type]}
       * @param  {Function}
       * @return {[type]}
       */
      function search_users(longitude, latitude, distance, startRow, limit, user_info, cb) {
        var shardKey = util.getUsersShardKey(longitude, latitude);
        var query = {
          shardKey: shardKey
        };

        if (user_info) {
          for (var key in user_info) {
            query[key] = util.convertQuery(user_info[key]);
          }
        }

        logger.log('debug', "Query: ", JSON.stringify(query));

        var cursor = users.aggregate([{
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude]
            },
            distanceField: "distance",
            spherical: true,
            limit: startRow + limit * 10,
            maxDistance: distance,
            query: {
              shardKey: shardKey
            },
            allowDiskUse: true
          }
        }, {
          $match: query
        }, {
          $skip: startRow
        }, {
          $limit: limit
        }]);

        cursor.toArray(function(err, docs) {
          if (err) return onerror(err, cb);
          // var user_list = [];
          // docs.forEach(function(doc) {
          //   user_list.push({
          //     id: doc.user_id,
          //     longitude: doc.pos.coordinates[0],
          //     latitude: doc.pos.coordinates[1],
          //     sex: doc.sex,
          //     age: doc.age,
          //     distance: doc.distance
          //   });
          // });
          // docs.forEach(function(doc) {
          //   doc.longitude = doc.pos.coordinates[0];
          //   doc.latitude = doc.pos.coordinates[1];
          // });
          logger.debug(JSON.stringify(docs));
          cb(null, docs);
        })
      }
      module.exports.search_users = search_users;

    });
  });
});

function onerror(err, cb) {
  console.error(err.stack);
  if (cb) cb(err);
}
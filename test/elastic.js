var request = require('request');
var _ = require('lodash');
var assert = require('assert');
var should = require('should');
var base_url = 'http://localhost:8000';
var config = require('../config.js');
var elasticClient;

if ("elastic" == config.backend) {
    describe('elasticuser', function() {
        var users;
        var insertCount = 10;
        var waitTimeout = 2000;
        var waitTime = 10000;
        elasticClient = require('../backend/elastic/client');

        // before(function(done) {
        //     this.timeout(10000);

        //     elasticClient.indices.delete({
        //         index: "*"
        //     }, function(err, res) {
        //         if (err) return done(err);
        //         elasticClient.indices.flushSynced().then(function() {
        //             console.log("===== delete all indices! ======");
        //             done();
        //         });

        //     });

        // });

        describe('upload_user', function() {

            it('upload & same shard update', function(done) {
                this.timeout(30000);
                waitTime = 10000;
                var post_data = {
                    'user_id': 1,
                    'city': 'Lasa',
                    'longitude': 100.1,
                    'latitude': 50.1,
                    'user_info': {
                        'sex': 1,
                        'age': 26,
                        'text': 'test1',
                        'double': 10.2
                    }
                };

                post(upload_url, post_data, function(err) {
                    if (err) return done(err);
                    setTimeout(function() {

                        elasticClient.indices.flushSynced().then(function() {
                            elasticClient.search({
                                index: "<users-{now/d}>",
                                q: 'user_id:1'
                            }, function(err, res) {
                                if (err) return done(err);
                                console.log(JSON.stringify(res));
                                res.hits.hits.should.with.lengthOf(1);
                                res.hits.hits[0]._source.user_id.should.equal(1);
                                res.hits.hits[0]._source.pos[0].should.equal(100.1);
                                res.hits.hits[0]._source.pos[1].should.equal(50.1);
                                res.hits.hits[0]._source.city.should.equal('Lasa');
                                res.hits.hits[0]._source.age.should.equal(26);

                                //updateTest
                                post_data.city = 'Shanghai';
                                post_data.longitude = 100.2;
                                post_data.latitude = 50.2;
                                post_data.user_info.age = 50;

                                post(upload_url, post_data, function(err) {
                                    if (err) return done(err);


                                    setTimeout(function() {
                                        elasticClient.indices.refresh(function() {
                                            elasticClient.search({
                                                index: "<users-{now/d}>",
                                                q: 'user_id:1'
                                            }, function(err, res) {
                                                if (err) return done(err);
                                                res.hits.hits.should.with.lengthOf(1);
                                                res.hits.hits[0]._source.pos[0].should.equal(100.2);
                                                res.hits.hits[0]._source.pos[1].should.equal(50.2);
                                                res.hits.hits[0]._source.city.should.equal('Shanghai');
                                                res.hits.hits[0]._source.age.should.equal(50);
                                                done();
                                            });
                                        });
                                    }, waitTime);
                                });
                            });

                        });
                    }, waitTime);
                });
            });
        });

        describe('delete_user', function() {
            this.timeout(40000);
            it('delete_one', function(done) {
                var post_data = {
                    'user_id': 1,
                    'city': 'Lasa',
                    'longitude': 100.1,
                    'latitude': 50.1,
                    'user_info': {
                        'sex': 1,
                        'age': 26,
                        'text': 'test1',
                        'double': 10.2
                    }
                };

                post(upload_url, post_data, function(err) {
                    if (err) return done(err);

                    setTimeout(function() {
                        elasticClient.search({
                            index: "<users-{now/d}>",
                            q: 'user_id:1'
                        }, function(err, res) {
                            if (err) return done(err);
                            res.hits.hits.should.with.lengthOf(1);


                            post_data = {
                                user_id: 1
                            };
                            post(delete_url, post_data, function(err, result) {
                                if (err) return done(err);
                                setTimeout(function() {
                                    elasticClient.search({
                                        index: "<users-{now/d}>",
                                        q: 'user_id:1'
                                    }, function(err, res) {
                                        if (err) return done(err);
                                        res.hits.hits.should.with.lengthOf(0);
                                        done();
                                    });
                                }, waitTime);
                            });
                        });
                    }, waitTime);
                });
            });
        });

    });

    describe('search_user', function() {

        it.only('search by distance', function(done) {
            var docs = [{
                'id': 1,
                'city': 'Lasa',
                'longitude': 100.1,
                'latitude': 50.1,
                'sex': 1,
                'age': 26,
                'text': 'test1',
                'double': 10.2
            }, {
                'id': 2,
                'city': 'Shanghai',
                'longitude': 100.2,
                'latitude': 50.2,
                'sex': 2,
                'age': 30,
                'text': 'test2',
                'double': 10.3,
            }, {
                'id': 3,
                'city': 'Beijing',
                'longitude': 100.3,
                'latitude': 50.3,
                'sex': 1,
                'age': 31,
                'text': 'test3',
                'double': 10.4,
            }];
            uploadMany(docs, function(err, result) {
                if (err) return done(err);

                //search 
                var post_data = {
                    'longitude': 100.1,
                    'latitude': 50.1,
                    'distance': 1000000,
                    'from': 0,
                    'size': 20,
                    params: {
                        age: {
                            lte: 30
                        }
                    }
                };

                post(search_url, post_data, function(err, result) {
                    if (err) return done(err);

                    result.result_list.should.with.lengthOf(2);
                    result.result_list[0].id.should.equal(1);
                    result.result_list[1].id.should.equal(2);
                    done();
                });
            });
        });

        it('search by distance with ne query', function(done) {
            var docs = [{
                'user_id': 1,
                'city': 'Lasa',
                'longitude': 100.1,
                'latitude': 50.1,
                'sex': 2,
                'age': 26,
                'text': 'test1',
                'double': 10.2,

            }, {
                'user_id': 2,
                'city': 'Shanghai',
                'longitude': 100.2,
                'latitude': 50.2,
                'sex': 2,
                'age': 30,
                'text': 'test2',
                'double': 10.3,

            }, {
                'user_id': 3,
                'city': 'Beijing',
                'longitude': 100.3,
                'latitude': 50.3,
                'sex': 1,
                'age': 31,
                'text': 'test3',
                'double': 10.4,

            }];
            uploadMany(docs, function(err, result) {
                if (err) return done(err);

                //search 
                var post_data = {
                    'longitude': 100,
                    'latitude': 50,
                    'distance': 1000000,
                    'page_no': 0,
                    'page_size': 20,
                    user_info: {
                        'user_id': {
                            ne: 1
                        },
                        sex: {
                            ne: 1
                        }
                    }
                };


                post(search_url, post_data, function(err, result) {
                    if (err) return done(err);

                    result.user_list.should.with.lengthOf(1);
                    result.user_list[0].user_id.should.equal(2);
                    done();
                });
            });
        });

        it('search by distance with multi hashcell', function(done) {
            this.timeout(40000);
            var docs = [{
                'user_id': 5,
                'city': 'Lasa',
                'longitude': 118.703612,
                'latitude': 32.16803,
                'sex': 2,
                'age': 26,
                'text': 'test1',
                'double': 10.2,

            }, {
                'user_id': 6,
                'city': 'Shanghai',
                'longitude': 118.703712,
                'latitude': 32.16813,
                'sex': 2,
                'age': 30,
                'text': 'test2',
                'double': 10.3,

            }, {
                'user_id': 7,
                'city': 'Beijing',
                'longitude': 118.703812,
                'latitude': 32.16823,
                'sex': 1,
                'age': 31,
                'text': 'test3',
                'double': 10.4,

            }, {
                'user_id': 8,
                'city': 'Beijing',
                'longitude': 118.719889,
                'latitude': 32.159731,
                'sex': 1,
                'age': 31,
                'text': 'test4',
                'double': 10.4,

            }];
            uploadMany(docs, function(err, result) {
                if (err) return done(err);

                //search 
                var post_data = {
                    'longitude': 118.703612,
                    'latitude': 32.16803,
                    'distance': 10000,
                    'page_no': 0,
                    'page_size': 20,
                    user_info: {
                        'user_id': {
                            ne: 5
                        }
                    }
                };


                post(search_url, post_data, function(err, result) {
                    if (err) return done(err);

                    result.user_list.should.with.lengthOf(3);
                    result.user_list[0].user_id.should.equal(6);
                    result.user_list[1].user_id.should.equal(7);
                    result.user_list[2].user_id.should.equal(8);
                    done();
                });
            });
        });

        it('search by distance with startRow page', function(done) {
            this.timeout(40000);
            var docs = [{
                'user_id': 15,
                'city': 'Lasa',
                'longitude': 117.703612,
                'latitude': 32.16803,
                'sex': 2,
                'age': 26,
                'text': 'test1',
                'double': 10.2,

            }, {
                'user_id': 16,
                'city': 'Shanghai',
                'longitude': 117.703712,
                'latitude': 32.16813,
                'sex': 2,
                'age': 30,
                'text': 'test2',
                'double': 10.3,

            }, {
                'user_id': 17,
                'city': 'Beijing',
                'longitude': 117.703812,
                'latitude': 32.16823,
                'sex': 1,
                'age': 31,
                'text': 'test3',
                'double': 10.4,

            }, {
                'user_id': 18,
                'city': 'Beijing',
                'longitude': 117.719889,
                'latitude': 32.159731,
                'sex': 1,
                'age': 31,
                'text': 'test4',
                'double': 10.4,

            }];
            uploadMany(docs, function(err, result) {
                if (err) return done(err);

                //search 
                var post_data = {
                    'longitude': 117.703612,
                    'latitude': 32.16803,
                    'distance': 10000,
                    'page_no': 2,
                    'page_size': 20,
                    user_info: {
                        'user_id': {
                            ne: 5
                        }
                    }
                };


                post(search_url, post_data, function(err, result) {
                    if (err) return done(err);

                    result.user_list.should.with.lengthOf(1);
                    result.user_list[0].user_id.should.equal(18);

                    var post_data = {
                        'longitude': 117.703612,
                        'latitude': 32.16803,
                        'distance': 10000,
                        'page_no': 120,
                        'page_size': 20,
                        user_info: {
                            'user_id': {
                                ne: 5
                            }
                        }
                    };


                    post(search_url, post_data, function(err, result) {
                        if (err) return done(err);

                        result.user_list.should.with.lengthOf(0);
                        done();
                    });

                });
            });
        });
    });
}
/*
upload_user_data
*/
var upload_url = "/testindex";


/*
/delete_user_data
*/
var delete_url = '/testindex';


/*
 *  search test
 */
var search_url = '/testindex/_search';


function post(url, data, cb) {
    request.post({
        url: base_url + url,
        body: data,
        json: true
    }, function(err, response, body) {
        if (err) return cb(err);
        console.log('\r\n \r\npost_data: \r\n' + JSON.stringify(data) + ' \r\nbody:\r\n' + JSON.stringify(body));
        cb(null, body);
    });
}

function uploadMany(docs, cb) {
    done = _.after(docs.length, cb);
    for (var i = 0; i < docs.length; i++) {
        post(upload_url, docs[i], function(err) {
            if (err) return console.log(err.stack);
            done();
        });
    }
}
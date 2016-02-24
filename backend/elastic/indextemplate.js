var client = require('./client');
var util = require('../../util');
var config = require('../../config');

/**
*init elastic index template
*/
function init() {
    client.indices.putTemplate({
        name: "users",
        body: {
            template: "*",
            settings: {
                refresh_interval: config.refresh_interval
            },
            mappings: {
                _default_: {
                    _all: {
                        enabled: false
                    },
                    dynamic_templates: [{
                        strings: {
                            match_mapping_type: "string",
                            mapping: {
                                type: "string",
                                index: "not_analyzed"
                            }
                        }
                    }, {
                        dates: {
                            match: "*_date",
                            mapping: {
                                type: "date"
                            }
                        }
                    }, {
                        location: {
                            match: "pos",
                            mapping: {
                                type: "geo_point",
                                geohash_prefix: true,
                                geohash_precision: 7
                            }
                        }
                    }]
                }
            }
        }
    }, function(err, res) {
        if (err) return util.onerror(err);
        console.log('===========  Template init success! ================');
    });
};

module.exports.init = init;
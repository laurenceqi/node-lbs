var elasticsearch = require('elasticsearch');
var config = require('../../config');
var client = new elasticsearch.Client({
  host: config.es_url,
  log: config.es_client_log_level,
  maxSockets: config.es_client_max_socket,
  sniffOnStart: true,
  requestTimeout: config.es_request_timeout
});
module.exports = client;

var template = require('./indextemplate');
template.init();


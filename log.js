var winston = require('winston');
var fs = require('fs');
try {
    fs.mkdirSync('logs');
} catch(err) {}

var logger = new(winston.Logger)({
    transports: [
        //comment below for production use
        new(winston.transports.Console)({
            timestamp: function() {
                return Date().toString();
            },
            level: 'debug'
        }),
        //comment up for production use
        new(winston.transports.File)({
            timestamp: function() {
                return Date().toString();
            },
            name: 'debug-log',
            filename: 'logs/lbs' + process.pid + '.log',
            maxsize: 50 * 1024 * 1024, //in bytes
            maxFiles: 10,
            tailable: true,
            level: 'info'
        }),
        new(winston.transports.File)({
            timestamp: function() {
                return Date().toString();
            },
            name: 'error-log',
            filename: 'logs/error' + process.pid + '.log',
            maxsize: 50 * 1024 * 1024, //in bytes,
            maxFiles: 10,
            tailable: true,
            level: 'error'
        }),

    ]
});

module.exports = logger;
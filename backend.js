var config = require('./config.js');
var backend;

if(config.backend == 'mongo'){
	console.log("backend support in process" + config.backend);
} else if(config.backend == 'elastic') {
	backend = {
        add: require('./backend/elastic/add.js'),
        delete: require('./backend/elastic/delete.js'),
        search: require('./backend/elastic/search.js'),
    };
} else {
	console.log("Unsupported backend " + config.backend);
}

function getBackend(module){
    return backend[module];
}

module.exports = getBackend;

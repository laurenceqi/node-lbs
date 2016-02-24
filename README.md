# node-lbs
a high performace lbs server written in node based on elasticsearch、rabbitmq and redis.

## Features
0. **High performace**
 
     With 2 node of elasticsearch(32Core), write tps is 20,000 and search qps is 4000(with cache enabled，5 million records in 10,000 square kilometers).

1. **Full configurable** 
    
    Write queue or search cache can be disabled. Many tune options provided. 

2. **Restful api**
3. **Document store support**

## Design Consideration 

* use geohash for location partition increase search performance
* cache based on geohash, increase search performace greatly with high density data 
* based on high performance search engine elasticsearch, for higher search performance.
* based on rabbitmq, async write for high write load. 
* based on redis for search result cache.

## Quick start

1. install node
2. install elasticsearch 
2. install rabbitmq (optional, only need when queue enabled)
3. install redis (optional, only need when cache enabled)
4. git clone to local directory
2. cd localdirectory
3. npm install
4. rename config.jsconfig.sample as config.jsconfig, and tune config
4. node index.js
5. node worker.js (optional, only need when queue enabled)
6. you can access serivce via http://localhost:8000/
7. enjoy!

## Contact me
If you are interested in the project, please let me know.

## Unit test
install mocha

    npm install -g mocha

test    

    npm test

## API
[API Doc](API.md)

## License
MIT



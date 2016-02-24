var client = require('./client');
var util = require('../../util');

//删除用户数据
function delete_data(index, id, cb) {
    client.delete({
        index: "<" + index + "-{now/d}>",
        type: index,
        id: util.zeropadding(id)
    }, function(err, res) {
        if (err) return onerror(err, cb);
        cb(null, res);
    });
}
module.exports.delete = delete_data;

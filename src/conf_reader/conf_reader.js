var fs = require('fs');
var file_reader = require('./file_reader');

module.exports = read_config;

function read_config(filename, callback){
	var result = [];
	fs.readFile(filename, 'utf8', function(err, data){
		if (err){
			throw err;
		}
		var config = JSON.parse(data);
		if (callback != null){
			callback(config);
		}
	});
}

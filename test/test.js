var assert = require('assert');

describe('Config entries should be properly loaded', function() {
	var conf_reader = require('../src/conf_reader/conf_reader');
	it ('Should have read the configuration file', function(done){
		conf_reader('example.json', function(entries){
			assert.equal(entries.sources.length, 8);
			done();
		});
	});
});


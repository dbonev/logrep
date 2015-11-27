var express = require('express');
var app = express();
var conf_reader = require('./src/conf_reader/conf_reader');
var path = require('path');
var Tail = require('tail').Tail;
var linqnode = require('linqnode');

var argv = process.argv;
var tail_buckets = {};
var endpoints_map = [];
linqnode.linqify(endpoints_map);
var distinct_endpoints = [];
linqnode.linqify(distinct_endpoints);

if (argv.length <= 2){
	print_help();
	return;	
}

var KEEP_ALIVE_INTERVAL = 50000;
var WAITING_STREAM = 'Waiting for stream content...<br/>';
var WAITING_DOT = '.';

function keep_alive(){
	distinct_endpoints.forEach(function(endpoint){
		endpoint.notify_idle();
	});

	setTimeout(keep_alive, KEEP_ALIVE_INTERVAL);
}

setTimeout(keep_alive, KEEP_ALIVE_INTERVAL);

function render_head(resp){
	resp.writeHead(200);
	resp.write('<html>');
	resp.write('<head>');
	resp.write('<head>');
	resp.write('<link href="/style.css" rel="stylesheet"/>');
	resp.write('</head>');
}

app.use(express.static(__dirname + '/styles'));

var config_file = argv[2];
conf_reader(config_file, function(conf){
	app.get('/', function(req, resp){
		render_head(resp);
		resp.write('<body>');
		resp.write('<h1>');
		resp.write('Log monitoring server running:\n');
		resp.write('</h1>');
		resp.write('<h2>');
		resp.write('The following endpoints are active');
		resp.write('</h2>');
		distinct_endpoints.order_by(function(ep) { return get_endpoint_name(ep.endpoint); }).select(function(ep) { return ep.endpoint; }).forEach(function(ep){
			resp.write('<a href="/'+ get_endpoint_name(ep) + '">' + get_endpoint_name(ep) + '</a>' + '\n');
			resp.write('</br>');
		});
		resp.write('</body>');
		resp.write('</html>');
		resp.end();
	});
	//create endpoint
	conf.sources.forEach(function(entry){
		var filename = entry.filename;
		var global_handlers = load_modules(entry.handlers);
		entry.endpoints.forEach(function(ep){
			var endpoint = expand_template(conf, ep);
			var all_handlers = load_local_handlers(global_handlers, endpoint);
			var endpoint_entry = { 
				endpoint: endpoint, 
				filename: filename, 
				handlers: all_handlers
			 };
			 endpoints_map.push(endpoint_entry);

			 var endpoint_name = get_endpoint_name(endpoint);
			 if (distinct_endpoints.first(function(ep) { return get_endpoint_name(ep.endpoint) === endpoint_name; }) == null){
				 distinct_endpoints.push({
					endpoint: endpoint_name,
					listeners: [],
					remove_listener: function (listener){
						var listener_index = this.listeners.indexOf(listener);
						if (listener_index > -1){
							this.listeners.splice(listener_index, 1);
						}
					},
					last_pushed: null,
					last_pushed_line: null,
					notify: function(line){
						var epe = this;
						this.listeners.forEach(function (resp){
							try {
								var successful_write = resp.write(format(line));
								if (!successful_write){
									epe.remove_listener(resp);
								} else {
									epe.last_pushed = new Date();
									epe.last_pushed_line = line;
								}
							} catch (e) {
								console.log(e);
								epe.remove_listener(resp);
							}
						});
					},
					notify_idle: function(){
						var now = new Date();
						if (this.last_pushed == null || (now - this.last_pushed) > KEEP_ALIVE_INTERVAL){
							var line = this.last_pushed_line === WAITING_STREAM || this.last_pushed_line === WAITING_DOT ? WAITING_DOT : WAITING_STREAM;
							this.notify (line);
							this.last_pushed_line = line;
							this.last_pushed = now;
						}
					}
				 });
			 }
		});

		var tail = new Tail(filename);
		tail.on('line', function(line){
			console.log('Received tail event for ' + filename + ' with line ' + line);
			var relevant_endpoints = endpoints_map.where(function(map) { return map.filename === filename; });
			var endpoints_to_notify = [];
			linqnode.linqify(endpoints_to_notify);
			relevant_endpoints.forEach(function(endpoint){
				var processed_line = process_line(line, endpoint);
				if (processed_line != null){
					var notify_ep = endpoints_to_notify.first(function(ep) { return ep.endpoint === endpoint.endpoint; });

					if (notify_ep == null){
						endpoints_to_notify.push({
							endpoint: endpoint.endpoint,
							lines: [ processed_line ]
						});
					} else if (notify_ep.lines.indexOf(processed_line) < 0){
							notify_ep.lines.push(processed_line);
					}
					console.log('Pushing ' + processed_line + ' into tail_bucket[' + filename + ']');
					
					tail_buckets[get_endpoint_name(endpoint.endpoint)].push(processed_line);
					ensure_tail_size(tail_buckets[get_endpoint_name(endpoint.endpoint)]);
				}
			});
			endpoints_to_notify.forEach(function(notify_ep){
				var endpoint = distinct_endpoints.first(function(ep) { return ep.endpoint === notify_ep.endpoint; });
				if (endpoint != null){
					notify_ep.lines.forEach(function(line){
						endpoint.notify(line + '<br/>');
					});
				}
			});
		});
		tail.watch();

		distinct_endpoints.forEach(function(ep){
			var endpoint = get_endpoint_name(ep.endpoint);
			tail_buckets[endpoint] = [];
			app.get('/' + endpoint, function(req, resp){
				console.log('GET for ' + endpoint + ' received');
				var result = tail_buckets[endpoint];
				render_head(resp);
				resp.write('Streaming content...');
				resp.write('<br/>');
				console.log("FN: " + filename + "::" + result.length);
				if (result != null){
					result.forEach(function(line){
						resp.write(format(line));
						resp.write('<br/>');
					});
				}
				ep.listeners.push(resp);
			});
		});
	});

	var port = conf.port == null ? 3000 : conf.port;

	var server = app.listen(conf.port, function(){
		console.log('Log monitoring server running on port ' + port);
	});
});

function format(line){
	return '<span class="' + get_css_class(line) + '">' + line + '</span>';
}

function get_css_class(line){
	if (line == null){
		return '';
	}
	var lower_line = line.toLowerCase();
	if (lower_line.indexOf('error') > -1){
		return 'error';
	} else if (lower_line.indexOf('critical') > -1){
		return 'error';
	} else if (lower_line.indexOf('warning') > -1){
		return 'warning';
	} else if (lower_line.indexOf('info') > -1){
		return 'info';
	}
}

var MAX_TAIL_SIZE = 500;
function ensure_tail_size(tail){
	var current_length = tail.length;
	if (current_length < MAX_TAIL_SIZE){
		return;
	}

	var to_remove = current_length - MAX_TAIL_SIZE;
	tail.splice(0, to_remove);
}

function print_help(){
	console.log('Usage:\n$ node index.js confg_file');
}

function load_modules(module_names){
	var result = [];
	if (module_names != null){
		module_names.forEach(function(name){
			var module = require(name);
			if (module != null){
				result.push(module);
			}
		});
	}
	return result;
}

function load_local_handlers(global_handlers, endpoint){
	var result = [];
	global_handlers.forEach(function(handler){
		result.push(handler);
	});
	if (endpoint.handlers != null && endpoint.handlers.length != 0){
		load_modules(endpoint.handlers).forEach(function(h){
			result.push(h);
		});
	}
	return result;
}

function process_line(line, endpoint){
	if (endpoint.handlers == null || endpoint.handlers.length == 0){
		return line;
	}
	var transformed = line;
	for (var i = 0; i < endpoint.handlers.length; i++){
		var handler = endpoint.handlers[i];
		transformed = handler(transformed);
		if (transformed == null){
			console.log('Dropping line from handler');
			return null;
		}
	}
	return transformed;
}

function get_endpoint_name(endpoint){
	if (endpoint.name != null){
		return endpoint.name;
	}
	return endpoint;
}

function expand_template(config, ep){
	var endpoint = get_endpoint_name(ep);
	if (endpoint.indexOf('templates.') == 0){
		var without_template = endpoint.substring('templates.'.length);
		var template = config.endpoint_templates[without_template];
		return template;
	} else {
		return endpoint;
	}
}


# logrep
A tiny log aggregation, transformation and streaming server


Logrep is a very simple, yet extremely flexible tool you can use to aggregate, transform and stream log files via http(s).
In the configuration file (example below) you specify which files you want to monitor and to which http endpoints they map, optionally, passing through handlers on their way.

Configuration json file example. With this configuration, the system will start monitoring the files as specified by the 'filename' directives and will stream them to the respective endpoints:

```
{

	// the port the server will be listening
	"port": 3000,
	// endpoints used more than once can be grouped into templates
	"endpoint_templates" : {
		"errors_warnings":
			{
				// the network endpoint name
				"name": "errors_warnings",
				// the handler(s) data pass through to reach this endpoint. These handlers can filter and transform the 
				// data on the way
				"handlers": ["./handlers/filters/errors_warnings"]
			}
	},
	// the files we will be monitoring
	"sources": [
		{
			"filename" : "/logs/log_frontend.txt",
			"endpoints" : [ "log_frontend", "all", "all_dev", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_frontend_qa.txt",
			"endpoints" : [ "log_frontend_qa", "all", "all_qa", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_load_balancer.txt",
			"endpoints" : [ "log_load_balancer", "all", "all_dev", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_load_balancer_qa.txt",
			"endpoints" : [ "log_load_balancer_qa", "all", "all_qa", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_worker_1.txt",
			"endpoints" : [ "log_worker_1", "all", "all_dev", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_worker_1_qa.txt",
			"endpoints" : [ "log_worker_1_qa", "all", "all_qa", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_worker_2.txt",
			"endpoints" : [ "log_worker_2", "all", "all_dev", "templates.errors_warnings" ]
		},
		{
			"filename" : "/logs/log_worker_2_qa.txt",
			"endpoints" : [ "log_worker_2_qa", "all", "all_qa", "templates.errors_warnings" ]
		}
	]
}

```

The above file will give you the following endpoints:

http://localhost:3000/
http://localhost:3000/all
http://localhost:3000/all_qa
http://localhost:3000/all_dev
http://localhost:3000/errors_warnings
http://localhost:3000/log_load_balancer
http://localhost:3000/log_load_balancer_qa
http://localhost:3000/log_worker_1
http://localhost:3000/log_worker_1_qa
http://localhost:3000/log_worker_2
http://localhost:3000/log_worker_2_qa

Each endpoint maps to a file or a group of files, possibly transformed with handlers.

module.exports = read_lines;

var readline = require('readline');
var fs = require('fs');

function read_lines(filename, on_line, on_close){
	var files = filename.split(',');
	if (are_all_files_read(files, on_close)){
		return;
	}
	var f = files[0];
	files = files.slice(1);
	read_file(f, on_line, function(){ on_file_complete(files, on_close); });
}

function on_file_complete(files, on_close){
	if (are_all_files_read(files)){
		on_close();
	} else {
		files = files.slice(1);
		read_file(f, on_line, function(){ on_file_complete(files, on_close); });
	}
}

function are_all_files_read(files){
	return files.length == 0;
}

function read_file(filename, on_line, on_close){
	var input = fs.createReadStream(filename);
	var rl_interface = readline.createInterface({
		input: input
	});
	rl_interface.on('line', function(line){
		if (on_line != null){
			on_line(line);
		}
	});
	rl_interface.on('close', function(){
		if (on_close != null){
			on_close();
		}
	});
}


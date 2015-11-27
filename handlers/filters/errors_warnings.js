module.exports = function(line){
	var lower_line = line.toLowerCase();
	if (lower_line.indexOf('error') >= 0 || lower_line.indexOf('warning') >= 0){
		return line;
	}
	return null;
}

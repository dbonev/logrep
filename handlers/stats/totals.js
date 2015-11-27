var total_writes = 0;
module.exports = function(line){
	total_writes++;
	return handle(line);
}


function handle(line){
	return 'Total writes received ' + total_writes.toString();
}

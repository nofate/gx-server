var express = require('express');
var app = express.createServer(express.logger());
app.use(express.bodyParser());

app.get('/', function(req, res) {
	res.send('OK');
});


var port = process.env.PORT || 3000;

app.listen(port, function() {
	console.log("Listening on " + port);
});
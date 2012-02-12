var express = require('express');
var auth = require('connect-auth');
var myauth = require('./gx-form-auth');
var connect = require("connect");

var app = express.createServer(
	express.logger(),
	express.bodyParser(),
	express.cookieParser(),
	express.session({ secret: "supertopsecret" }),	
	auth(myauth())
);


app.get('/', function(req, res) {
		req.authenticate(['someName'], function(error, authenticated) { res.send('OK'); } );
		
});


var port = process.env.PORT || 3000;

app.listen(port, function() {
	console.log("Listening on " + port);
});
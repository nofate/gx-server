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

app.use(express.static(__dirname + '/static'));

/*
app.get('/', function(req, res) {
		req.authenticate(['someName'], function(error, authenticated) { res.send('OK'); } );
		
});
*/
app.get('/', function(req, res) {
	var model = { title : { main: "hello world!", subtitle: "subtitle" }, layout: false };
	res.render('index.jade', model);		
});

app.get('/chat', function(req, res) {
	req.authenticate(['someName'], function(err, authenticated) {
		var options = { locals : { user: req.session.user.login }, layout: false };
		res.render('index.jade', options);		
	});
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
	console.log("Listening on " + port);
});
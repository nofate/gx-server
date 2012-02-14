var connect = require('connect');
var url = require('url');
var util = require('util');
var Mongolian = require('mongolian');
var db = (new Mongolian).db("gx");
var users = db.collection('users');

module.exports = function(options) {
	options = options || {};
	var auth = {};
	var my = {};
	auth.name = options.name || "someName";

	function failed_validation(request, response, uri) {
		var parsedUrl = url.parse(request.url, true);
		var redirectUrl = "/auth/form_callback";
		console.log(parsedUrl.query.redirect_url);
		if(uri) {
			redirectUrl = redirectUrl + "?redirect_url=" + uri;
		} else if(parsedUrl.query && parsedUrl.query.redirect_url) {
			redirectUrl = redirectUrl + "?redirect_url=" + parsedUrl.query.redirect_url;
		}

		response.writeHead(303, { 'Location': redirectUrl });
		response.end('');
	}

	function validate_credentials(executionScope, request, response, callback) {
		setTimeout(function() {
			var parsedUrl = url.parse(request.url, true);
			console.log('validating credendials');
			if (request.body && request.body.login && request.body.password) {

				console.log("login: " + request.body.login);
				console.log("pass: " + request.body.password);
				users.findOne( { login: request.body.login }, function(err, user) {
					if (user != undefined && user.password == request.body.password) {
						console.log('OK');
						request.session.user = user;
						executionScope.success( { name:request.body.login }, callback );
					} else {
						console.log('BAD');
						executionScope.fail(callback);					
					}
				});
			} else {
				console.log('FAIL');
				failed_validation(request, response);
			}	
		}, 100);	
	};

	auth.authenticate = function(request, response, callback) {
		console.log("Authenticate attempt\n");
		console.log(util.inspect(util.inspect(request.body)));
		console.log("login: " + request.body.login);
		console.log("pass: " + request.body.password);
		
		if (request.body && request.body.login && request.body.password) {
			console.log("\nValidation\n");
			validate_credentials(this, request, response, callback);
		} else {
			console.log("\nFailed validation\n");
			failed_validation(request, response, request.url);
		}
	};	

	auth.setupRoutes = function(server) {
		server.use('/', connect.router(function routes(app) {
			app.post('/auth/form_callback', function(request, response) {
				console.log("\nPOST authenticate\n");
				request.authenticate([auth.name], function(error, authenticated) {
					var redirectUrl = "/";
					var parsedUrl = url.parse(request.url, true);

					if(parsedUrl.query && parsedUrl.query.redirect_url) {
						redirectUrl = parsedUrl.query.redirect_url;
						console.log("Redirect: " + parsedUrl.query.redirect_url);
					}
					console.log("Redirect: " + redirectUrl);
					response.writeHead(303, { 'Location': redirectUrl });
					response.end('');
				});
			});

			app.get('/auth/form_callback', function(request, response) {
				response.writeHead(200, { 'Content-Type': 'text/html' });
				var parsedUrl = url.parse(request.url, true);
				var redirectUrl = "";

				if(parsedUrl.query && parsedUrl.query.redirect_url) {
					redirectUrl = "?redirect_url=" + parsedUrl.query.redirect_url;
				} 

				response.end("<html><body><form action='/auth/form_callback" + redirectUrl + "' method='POST'>" +
					"<label for='login'>Login</label><input type='text' name='login' id='login' /><br/>" +
					"<label for='password'>Password</label><input type='text' name='password' id='password' />" +
					"<input type='submit' />" +
					"</form></body></html>");
			});	
		}));
	};

	return auth;
};
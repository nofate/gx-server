var express = require('express');
var auth = require('connect-auth');
var myauth = require('./gx-form-auth');
var connect = require("connect");
var MemoryStore = require('connect/lib/middleware/session/memory');
var io = require('socket.io');
var sio = require('socket.io-sessions');
var events = require('events');
var db = require('./db').connection;
var fs = require('fs');
var crypto = require('crypto');


var privateKey = fs.readFileSync('keys/server.key').toString();
var certificate = fs.readFileSync('keys/server.pem').toString();


var session_store = new MemoryStore();

var app = express.createServer( { key: privateKey, cert: certificate} );



var io = io.listen(app,  { key: privateKey, cert: certificate});

var socket = sio.enable({
	socket: io,
	store: session_store,
	parser: connect.cookieParser(),
	per_message: false
});

app.use(express.static(__dirname + '/static'));
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ store: session_store, secret: "supertopsecret" }));
app.use(auth(myauth()));

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


var port = process.env.PORT || 443;

app.listen(port, function() {
	console.log("Listening on " + port);
});


Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

var players = new Array();



socket.on('sconnection', function(client, session) {
	console.log('New connection from: ', session.user.login);
	client.emit('greet', 'Hello, ' + session.user.login);
    socket.sockets.emit('user-list', { type:'add', user: session.user.login });

	client.on('msg', function(data) {
		console.log('Message from', session.user.login, ': ', data);
		socket.sockets.emit('msg', { user: session.user.login, msg: data.data} );
	});

    client.on('join', function() {
        console.log('User', session.user.login, ' joined game');
        socket.sockets.emit('sys', { user: session.user.login, type: "join"} );
        players[session.user.login] = { socket: client };
        console.log(players);
    });

    client.on('quit', function() {
        console.log('User ', session.user.login, ' quit game');
        socket.sockets.emit('sys', { user: session.user.login, type: "quit"} );
        delete players[session.user.login];
        console.log(players);
    });

    client.on('bet', function(data) {
        if (players[session.user.login] != undefined) {
            players[session.user.login].answer = data;
        }
        else {

        }
    });

    client.on('ladder', function() {
        db.collection('users').find({ score: { $gt: 0 }}).sort({ score: -1}).toArray(function(err, users){
            socket.sockets.emit('ladder',  users);
        });
    });

    client.on('disconnect', function() {
        socket.sockets.emit('user-list', { type:'remove', user: session.user.login });
        console.log('User '+ session.user.login + ' disconnected');
    });
});


var game_loop = new events.EventEmitter();
var state = 'wait', old_state = 'wait';
var my_number = 0;

game_loop.addListener('beat', function() {

    if (Object.size(players) > 1) {
        state = 'game'
    } else {
        state = 'wait'
    }

    if (state == 'game' && old_state == 'wait') {
        my_number = Math.round(Math.random()*1000);
        socket.sockets.emit('sys', { type: "started" } );
    }
    else if (state == 'game' && old_state == 'game') {
        var win = false;

        for (key in players) {
            if (players[key].answer != undefined) {
                console.log(players[key]);
                if (my_number > players[key].answer) {
                    players[key].socket.emit('sys', { type: 'eval', answer: players[key].answer, result: 'more'  })
                }
                else if (my_number < players[key].answer) {
                    players[key].socket.emit('sys', { type: 'eval', answer: players[key].answer, result: 'less'  })
                }
                else if (my_number == players[key].answer) {
                    players[key].winner = true;
                    win = true;
                }
            }
        }

        if (win) {
            state = 'wait';
        }
    }
    if (state == 'wait' && old_state == 'game') {
        var min = 1000;
        var winners = [];
        var delta = 0;
        var score = Object.size(players);
        for (key in players) {
            if (players[key].winner) {
                winners.push(key);
                db.collection('users').findOne({login: key}, function(err, user) {
                    if (user.score == undefined || user.score == null || user.score == NaN) {
                        user.score = score;
                    }
                    else {
                        user.score += score;
                    }

                    db.collection('users').save(user);
                });
            }
        }

        players = new Array();
        socket.sockets.emit('sys', { type: "finished", number: my_number, winners: winners } );
    }


    old_state = state;


    setTimeout(function() {
        game_loop.emit('beat');
    }, 2000);
});

game_loop.emit('beat');

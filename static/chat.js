var socket = io.connectWithSession(null, { port: 443, secure: true });

socket.on('greet', function(data) {
	renderSystemMessage(data);
    socket.emit('ladder');
});

socket.on('msg', function(data) {
	renderMessage(data);
});

socket.on('sys', function(data) {
    if (data.type == 'join') {
        renderSystemMessage("User <b>" + data.user + "</b> joins game.")
    }
    else if (data.type == 'quit') {
        renderSystemMessage("User <b>" + data.user + "</b> quits game.")
    }
    else if (data.type == 'started') {
        renderSystemMessage("Game has started. Good luck!.")    
    }
    else if (data.type == 'finished') {
        socket.emit('ladder');
        var winners = data.winners.join(', ');
        renderSystemMessage("Game finished. Congratulations to <b>" + winners + "</b>. My number was <b>" + data.number + "</b>");
        $("#quit-game").hide();
        $("#bet-game").hide();
        $("#join-game").show();
    }
    else if (data.type == 'eval') {
        renderSystemMessage("You tried <b>" + data.answer + "</b>. My number was <b>" + data.result + "</b> than yours.");
    }
});

socket.on('ladder', function(data) {
    $("#ladder").empty();
    var html = "<table><tr><th>Player</th><th>Score</th></tr>";
    for (key in data) {
        html += "<tr><td>" + data[key].login + "</td><td>" + data[key].score + "</td></tr>";
    }
    html += "</table>";
    $("#ladder").append(html);
});

socket.on('user-list', function(data) {

    if (data.type == 'add') {
        var html = "User <b>" + data.user + "</b> connected.";
        renderSystemMessage(html);
    }
    else if (data.type == 'remove') {
        var html = "User <b>" + data.user + "</b> disconnected.";
        renderSystemMessage(html);
    }
});

function sendMessage() {
    var message = $("#message").val();
    socket.emit('msg', { data: message });
    $("#message").val("");
}


$(document).ready(function() {

	$("#submit").click(function(){
        sendMessage();
	});


    $("#message").keypress(function(e){
        if ((e.keyCode || e.which) == 13 ) {
            sendMessage();
            return false;
        }
    });

    $("#join-game").click(function() {
        joinGame();
    });

    $("#quit-game").hide();
    $("#bet-game").hide();

    $("#quit-game").click(function() {
        quitGame();
    });

    $("#bet-game").click(function() {
        var message = $("#message").val();
        socket.emit('bet', message);
    });
});


function renderSystemMessage(data){
	var msg = '<div><i>' + data + '</i></div>';
	$("#chatbox").append(msg);
    $("#chatbox div:last-child")[0].scrollIntoView(false);
}

function renderMessage(data) {
	var user = data.user;
	var msg = data.msg;
	var html = '<div><b>' + user + '</b>:' + msg + '</div>';
	$("#chatbox").append(html);
    $("#chatbox div:last-child")[0].scrollIntoView(false);
}

function joinGame(){
    $("#join-game").hide();
    $("#quit-game").show();
    $("#bet-game").show();

    socket.emit('join');
}

function quitGame() {
    $("#quit-game").hide();
    $("#bet-game").hide();
    $("#join-game").show();

    socket.emit('quit');
}

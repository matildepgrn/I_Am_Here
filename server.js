var code = require('./code');


var http = require('http');
var fs = require('fs');
var path = require('path');
//var mysql = require('mysql');

//var con = mysql.createConnection({
//  host: "localhost",
//  user: "teste",
//  password: "password"
//});

//con.connect(function(err) {
//  if (err) throw err;
//  console.log("Connected!");
//});

http.createServer(function (req, res) {
	
	console.log(req.method + " " + req.url);
	
	if(req.method == "POST") {
		getPostData(req, res);
		return;
	}

	switch(req.url) {
		case "/":
		case "/index.html":
			sendFile(res, 'client/index.html');
			break;
		case "/style.css":
			sendFile(res, 'client/style.css', 'text/css');
			break;
		case "/script.js":
			sendFile(res, 'client/script.js');
			break;
		case "/student":
			sendFile(res, 'client/student.html');
			break;
		case "/prof":
			sendFile(res, 'client/prof.html');
			break;
		case "/getcode":
			generateCode(res);
			break;
		case "/status":
			status(res);
			break;
		default:
			sendText(res, "File not found.", 404);
			break;
	}

}).listen(8080); //the server object listens on port 8080

function sendText(res, text, status = 200) {
	res.writeHead(status, {'Content-Type': 'text/plain'});
	res.write(text);
	res.end();
}

function sendFile(res, filename, type = 'text/html') {
	var filePath = path.join(__dirname, filename);
    var stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
}

function sendJSON(res, json, status = 200) {
	res.writeHead(status, {'Content-Type': 'application/json'});
	res.write(JSON.stringify(json));
	res.end();
}

function getPostData(req, res) {
	var data = '';
	req.on('data', chunk => {
		if(data.length > 512) {
			res.end('Input data too big.');
			return;
		}
		data += chunk.toString();
	});
	req.on('end', () => {
		console.log(data);
		handlePost(req, res, data);
	});
}

function handlePost(req, res, data) {
	switch(req.url) {
		case "/validatecode":
			sendText(res, data);
			break;
		default:
			sendText(res, "File not found (POST).", 404);
			break;
	}
}

function generateCode(res) {
	var cur_code = code.newCode();
	sendJSON(res, cur_code);
}

function status(res) {
	sendJSON(res, code.status());
}
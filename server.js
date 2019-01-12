var PORT = 9080;
var HTTPS = true;

var code = require('./code');
var http = HTTPS ? require('https') : require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
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

const options = {
	key: fs.readFileSync('cert.key'),
	cert: fs.readFileSync('cert.crt'),
	ca: fs.readFileSync('cert_ca.crt')
};

http.createServer(options, function (req, res) {

	console.log(req.method + " " + req.url);
	
	if(req.method == "POST") {
		getPostData(req, res);
		return;
	}

	var parsedURL = url.parse(req.url, true);
	switch(parsedURL.pathname) {
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
			styledTest(req, res, parsedURL);
			//sendFile(res, 'client/prof.html');
			break;
		case "/getcode":
			generateCode(res);
			break;
		case "/getcode/stop":
			var statusJson = code.stopProcess();
			sendJSON(res, statusJson);
			break;
		case "/status":
			status(res);
			break;
		default:
			sendText(res, "File not found.", 404);
			break;
	}

}).listen(PORT); //the server object listens on port 9080

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
			sendText(res, code.validateCode(data) + "");
			break;
		default:
			sendText(res, "File not found (POST).", 404);
			break;
	}
}

function generateCode(res) {
	var statusJson = code.newCode();
	sendJSON(res, statusJson);
}

function status(res) {
	sendJSON(res, code.status());
}

function styledTest(req, res, parsedURL) {
	var t = parsedURL.query.t;
	var n = parsedURL.query.n;
	console.log(t, n);
	if(t == "L" || t == "N" || t== "LN" &&
		n == 4 || n == 5 || n == 6 || n == 7 || n == 8) {
		code.customizeTest(n, t);
	}
	sendFile(res, 'client/prof.html');
}

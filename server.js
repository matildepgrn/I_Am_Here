var config = require('./default_config');
var fenix_api = require('./fenix_api');

var code = require('./code');
var http = config.use_HTTPS ? require('https') : require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var mysql = require('mysql');
var request = require('request');
var moment = require('moment');

var con = mysql.createConnection({
	host: config.mysql_host,
	user: config.mysql_user,
	password: config.mysql_pw,
	database: config.mysql_database
});

con.connect(function(err) {
	if (err) throw err;
	console.log("Connected to database!");
});

const options = {
	key: config.use_HTTPS ? fs.readFileSync(config.tls_cert_key) : '',
	cert: config.use_HTTPS ? fs.readFileSync(config.tls_cert_crt) : '',
	ca: config.use_HTTPS ? fs.readFileSync(config.tls_cert_ca) : ''
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
		case "/login":
			fenix_api.redirectURL(res, config.EXTERNAL_LOGIN_URL);
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
		case "/oauth":
			var fenix_code = parsedURL.query.code;
			fenix_api.requestAccessToken(con, res, fenix_code);
			
			break;
		default:
			sendText(res, "File not found.", 404);
			break;
	}

}).listen(config.PORT); //the server object listens on config.PORT


function parseCookies (req) {
    var list = {},
        rc = req.headers.cookie;

    rc && rc.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

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

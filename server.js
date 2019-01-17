var config = require('./default_config');
var database = require('./database/Database');
var Service = require('./Service');

var code = require('./code');
var http = config.use_HTTPS ? require('https') : require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var mysql = require('mysql');
var request = require('request');
var moment = require('moment');
var Cookies = require('cookies');

var service = new Service();
var db = new database(150, config.mysql_host, config.mysql_user, config.mysql_pw, config.mysql_database);

const options = {
	key: config.use_HTTPS ? fs.readFileSync(config.tls_cert_key) : '',
	cert: config.use_HTTPS ? fs.readFileSync(config.tls_cert_crt) : '',
	ca: config.use_HTTPS ? fs.readFileSync(config.tls_cert_ca) : ''
};

http.createServer(options, function (req, res) {
  	
  	var cookies = new Cookies(req, res);

	console.log(req.method + " " + req.url);
	
	if(req.method == "POST") {
		getPostData(req, res);
		return;
	}

	var parsedURL = url.parse(req.url, true);
	switch(parsedURL.pathname) {
		case "/":
		case "/index.html":
			sendFile(res, 'index.html');
			break;
		case "/login":
			goToLogin(res, cookies, parsedURL);
			break;
		case "/style.css":
			sendFile(res, 'style.css', 'text/css');
			break;
		case "/script.js":
			sendFile(res, 'client/script.js');
			break;
		case "/student":
		case "/prof":
			verifyLogin(res, cookies, parsedURL,
				function(ist_id){
					switch(parsedURL.pathname) {
						case "/student":
							sendFile(res, 'client/student.html');
							break;
						case "/prof":
							styledTest(req, res, parsedURL);
							break;
						default:
							console.log('This sould not happen');
							sendText(res, "Error.", 501);
							break;
					}
				} 
			);
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
			service.getAccessToken(db, res, fenix_code,
				function(iamhere_token){
					cookies.set('login', iamhere_token);
					var last_url = cookies.get('last_url');
					if(last_url) {
						redirectURL(res, last_url);
					} else {
						redirectURL(res, "/student");	
					}
				});
			break;
		default:
			sendText(res, "File not found.", 404);
			break;
	}

}).listen(config.PORT); //the server object listens on config.PORT

function redirectURL(res, url) {
	res.writeHead(301,
		{Location: url}
	);
	res.end();
}


function goToLogin(res, cookies, parsedURL) {
	cookies.set('last_url', parsedURL.pathname);
	redirectURL(res, config.EXTERNAL_LOGIN_URL);	
}

function verifyLogin(res, cookies, parsedURL, callback) {
	var token = cookies.get('login');
	service.verifyLogin(db, token,
		function(ist_id){
			if(ist_id != null){
				callback(ist_id);
			}
			else {
				goToLogin(res, cookies, parsedURL);
			}
		}
	);
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

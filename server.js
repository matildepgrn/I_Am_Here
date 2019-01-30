var config = require('./default_config');
var database = require('./database/Database');
var Service = require('./Service');

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
	
	var parsedURL = url.parse(req.url, true);

	if(req.method == "POST") {
		getPostData(req, res, cookies, parsedURL);
		return;
	}

	switch(parsedURL.pathname) {
		case "/":
		case "/index.html":
			isLoggedIn(res, cookies, parsedURL,
				function(ist_id){
					sendFile(res, 'student.html');
				},
				function(){
					sendFile(res, 'index.html');
				}
			);
			break;
		case "/qrcode.min.js":
			sendFile(res, 'qrcode.min.js', 'application/javascrip');
			break;
		case "/login":
			disableCache(res);
			goToLogin(res, cookies, parsedURL);
			break;
		case "/style.css":
			sendFile(res, 'style.css', 'text/css');
			break;
		case "/script.js":
			sendFile(res, 'client/script.js');
			break;
		case "/logout":
			disableCache(res);
			isLoggedIn(res, cookies, parsedURL,
				function(ist_id){
					service.removeIAmHereToken(db, ist_id,
						function(error, success){
							if(success) {  
								redirectURL(res, "/");
							} else {
								console.log("Error logging out.", ist_id, error);
								sendText(res, "Error logging out.");
							}
						}
					);
				},
				function(){
					redirectURL(res, "/");
				}
			);
			break;
		case "/api/name":
			disableCache(res);
			isLoggedIn(res, cookies, parsedURL,
				function(ist_id){
					service.getUserName(db, ist_id,
						function(name){
							sendText(res, name);
						}
					);
				},
				function(){
					sendText(res, "Not logged in", 403);
				}
			);
			break;
		case "/a":
		case "/student":
		case "/professor":
		case "/professor/classes":
		case "/professor/attendance":
			makeUserLogin(res, cookies, parsedURL,
				function(ist_id){
					switch(parsedURL.pathname) {
						case "/a":
							sendFile(res, 'student.html');
							break;
						case "/student":
							sendFile(res, 'student.html');
							break;
						case "/professor":
							sendFile(res, 'professor.html');
							break;
						case "/professor/attendance":
							sendFile(res, 'professor_attendance.html');
							break;
						case "/professor/classes":
							sendFile(res, 'professor_classes.html');
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
		case "/oauth":
			var fenix_code = parsedURL.query.code;
			service.getAccessToken(db, res, fenix_code,
				function(iamhere_token){
					cookies.set('login', iamhere_token);
					var last_url = cookies.get('last_url');
					if(last_url && last_url == "/login") {
						redirectURL(res, "/");
					} else if(last_url) {
						redirectURL(res, last_url);
					} else {
						redirectURL(res, "/");	
					}
				});
			break;
		default:
			sendText(res, "File not found.", 404);
			break;
	}

}).listen(config.PORT); //the server object listens on config.PORT

function disableCache(res) {
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}


function redirectURL(res, url) {
	console.log("redirecting to: ", url);
	res.writeHead(301,
		{Location: url}
	);
	res.end();
}


function goToLogin(res, cookies, parsedURL) {
	console.log("goToLogin: setting cookie");
	cookies.set('last_url', parsedURL.pathname);
	redirectURL(res, config.EXTERNAL_LOGIN_URL);	
}

function isLoggedIn(res, cookies, parsedURL, callback_true, callback_false) {
	var token = cookies.get('login');
	service.verifyLogin(db, token,
		function(ist_id){
			if(ist_id != null){
				callback_true(ist_id);
			}
			else {
				callback_false();
			}
		}
	);
}

function makeUserLogin(res, cookies, parsedURL, callback) {
	console.log("Make user login: ", parsedURL.pathname);
	isLoggedIn(res, cookies, parsedURL,
		//callback_true
		function(ist_id){
			console.log("IsLogged in as: ", ist_id);
			callback(ist_id);
		},
		//callback_false
		function(){
			console.log("isNOTlogged in.");
			goToLogin(res, cookies, parsedURL);
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

function getPostData(req, res, cookies, parsedURL) {
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
		handlePost(req, res, cookies, parsedURL, data);
	});
}

function handlePost(req, res, cookies, parsedURL, data) {
	switch(req.url) {
		case "/api/status":
		case "/api/getcode":
		case "/api/getcode/stop":
		case "/api/validatecode":
			isLoggedIn(res, cookies, parsedURL,
				function(ist_id) {
					var json = JSON.parse(data);
					var randomID = json.randomID;
					switch(req.url) {
						case "/api/status":
							service.getStatus(ist_id, randomID,
								function(status) {
									sendJSON(res, status);
								}
							);
						break;
						case "/api/getcode/stop":
							service.stopProcess(ist_id, randomID,
								function(status) {
									sendJSON(res, status);
								}
							);
						break;
						case "/api/getcode":
							service.generateCode(ist_id, randomID,
								function(status) {
									sendJSON(res, status);
								}
							);
						break;
						case "/api/validatecode":
							var client_code = json.input_code;
							service.validateCode(db, res, randomID, client_code, ist_id,
								function(error, result) {
									sendText(res, '' + result); //TODO
								}
							);
						break;
					}
				},
				function() {
					sendText(res, "Not logged in", 403);
				}
			);
			break;
		case "/api/createAttendanceSession":
			var json = JSON.parse(data);
			service.getAttendanceRandomID(db, json.code_type, json.code_length, json.time, json.consecutivecodes,
				function(error, randomID, attendanceID) {
					var json_res = {};
					json_res.url = config.WEBSITE_URL + "/a?c=" + randomID;
					json_res.randomID = randomID;
					//console.log(Array.from(attendanceMap));
					sendJSON(res, json_res);
				}
			);
			break;
		default:
			sendText(res, "File not found (POST).", 404);
			break;
	}
}


function styledTest(req, res, parsedURL) {
	var t = parsedURL.query.t;
	var n = parsedURL.query.n;

	if(t == "L" || t == "N" || t== "LN" &&
		n == 4 || n == 5 || n == 6 || n == 7 || n == 8) {
		code.customizeTest(n, t);
	}
	sendFile(res, 'client/prof.html');
}

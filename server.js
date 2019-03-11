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

function handleRequest(req, res) {
  	
  	var cookies = new Cookies(req, res);
	
	var parsedURL = url.parse(req.url, true);

	if(req.method == "POST") {
		getPostData(req, res, cookies, parsedURL);
		return;
	}

	switch(parsedURL.pathname) {
		case "/api/H6YsZVWpIkXKeORd291yYLvEFfowzTcP3O5tRp9m/pcm1819_attendance.tsv":
			sendFile(res, 'studentsattending.tsv', 'text/plain; charset=utf-8');
			break;
		case "/":
		case "/index.html":
			isLoggedInAsProf(res, cookies, parsedURL,
				function(ist_id, is_professor){
					if(is_professor) {
						sendFile(res, 'professor/professor_new.html');
					} else {		//os alunos que sao profs nao vao ter acesso a pagina index.html dos alunos
						sendFile(res, 'student/student_index.html');
					}
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
					switch(parsedURL.pathname) {
						case "/api/name":
							service.getUserName(db, ist_id,
								function(name){
									sendText(res, name);
								}
							);
							break;
					}
				},
				function(){
					sendText(res, "Not logged in", 403);
				}
			);
			break;
		case "/api/getattendancehistory":
		case "/api/courses":
		case "/api/history":
		case "/api/fingerprint":
		case "/api/pcm1819attendance":
			disableCache(res);
			isLoggedInAsProf(res, cookies, parsedURL,
				function(ist_id, is_professor){
					if(false == is_professor){
						sendText(res, "User not authorized.", 403);
						return;
					}
					switch(parsedURL.pathname) {
						case "/api/getattendancehistory":
							var attendanceID_int = parseInt(parsedURL.query.rid);
							if(attendanceID_int){
								service.getClassHistory(db, attendanceID_int,
									function(error, o) {
										if(error) {
											sendText(res, "Could not get class history.", 500);
										} else {
											sendJSON(res, o);
										}
									}
								);
							} else {
								sendText(res, "Invalid attendance link.");
							}
							break;
						case "/api/courses":
							service.selectCourseInfo(db, ist_id,
								function(error, rows) {
									if(error) {
										sendText(res, "Could not select course info.", 500);
									} else {
										sendJSON(res, rows);
									}
								}
							);
							break;
						case "/api/history":
							service.getAttendanceHistory(db, ist_id,
								function(error, rows) {
									if(error) {
										sendText(res, "Could not get attendande history.", 500);
									} else {
										sendJSON(res, rows);
									}
								}
							);
							break;
						case "/api/fingerprint":
							var attendanceID_int = parseInt(parsedURL.query.f);
							var student_id = parsedURL.query.i;
							service.getFingerprintData(db, student_id, attendanceID_int,
								function(error, rows){
									if(error) {
										sendText(res, "Could not load fingerprint", 500);
									} else{
										sendJSON(res, rows);	
									}
								}
							);
							break;
						case "/api/pcm1819attendance":
							sendFile(res, 'studentsattending.tsv', 'text/plain; charset=utf-8');
							break;
					}
				},
				function(){
					sendText(res, "Not logged in", 403);
				}
			);
			break;
		case "/a":
		case "/student":
			makeUserLogin(res, cookies, parsedURL,
				function(ist_id){
					switch(parsedURL.pathname) {
						case "/a":
							var randomID_int = parseInt(parsedURL.query.c);
							if(!randomID_int) {
								sendText(res, "Invalid attendance link.");
								return;
							}
							var useragent = req.headers['user-agent'];
							var user_ip;
							if(config.isBehindProxy) {
								user_ip = req.headers['x-real-ip'];
							} else {
								user_ip = req.connection.remoteAddress;
							}
							service.verifyRandomID(db, randomID_int, ist_id, useragent, user_ip,
								function(error, isValid, isChecked){
									if(error) {
										console.log("Error in verifyRandomID (probably while saving fingerprint; page still served).");
									}
									if(isValid){
										if(isChecked) {
											sendText(res, 'Attendance already checked for this session.');
										} else {
											sendFile(res, 'student/student.html');
										}
									} else {
										sendText(res, "Invalid attendance link!");
									}
								}
							);
							break;
						case "/student":
							sendFile(res, 'student/student.html');
							break;
						default:
							console.log('This sould not happen');
							sendText(res, "Error.", 501);
							break;
					}
				} 
			);
			break;
		case "/professor":
		case "/professor/new":
		case "/professor/attendance":
		case "/professor/courses":
			makeProfessorLogin(res, cookies, parsedURL,
				function(ist_id, is_professor){
					if(false == is_professor){
						sendText(res, "User not authorized.", 403);
						return;
					}
					switch(parsedURL.pathname) {
						case "/professor":
							sendFile(res, 'professor/professor_classes.html');
							break;
						case "/professor/new":
							sendFile(res, 'professor/professor_new.html');
							break;
						case "/professor/attendance":
							sendFile(res, 'professor/professor_attendance.html');
							break;
						case "/professor/courses":
							sendFile(res, 'professor/professor_classes.html');
							break;
						default:
							console.log('This sould not happen');
							sendText(res, "Error.", 501);
							break;
					}
				}
			);
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
				}
			);
			break;
		default:
			sendText(res, "File not found.", 404);
			break;
	}
}

var server = http.createServer(options, function (req, res) {
	try {
		return handleRequest(req, res);
	} catch (error) {
		try {
			console.log("Exception in handleRequest:", error);
			if(!req.finished) {
				sendText(res, "Internal server error.", 503);
			}
		} catch(error2) {
			console.error("Exception while handling handleRequest Exception:", error2);
		}
	}
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.on('error', function(e) {
	console.log("Server error", e);
});

server.on('listening', function() {
	console.log("Server listening on", server.address());
});

server.listen(config.PORT); //the server object listens on config.PORT

function disableCache(res) {
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}


function redirectURL(res, url) {
	res.writeHead(301,
		{Location: url}
	);
	res.end();
}


function goToLogin(res, cookies, parsedURL) {
	cookies.set('last_url', parsedURL.path);
	redirectURL(res, config.EXTERNAL_LOGIN_URL);	
}

function isLoggedInAsProf(res, cookies, parsedURL, callback_true, callback_false) {
	return isLoggedIn(res, cookies, parsedURL, callback_true, callback_false, true);
}

function isLoggedIn(res, cookies, parsedURL, callback_true, callback_false, needsBeProf = false) {
	var token = cookies.get('login');
	service.verifyLogin(db, token,
		function(ist_id){
			if(ist_id != null){
				if(needsBeProf) {
					service.isProfessor(db, ist_id,
						function(error, is_professor) {
							callback_true(ist_id, is_professor);
						}
					);
				} else {
					callback_true(ist_id);
				}
			}
			else {
				callback_false();
			}
		}
	);
}

function makeUserLogin(res, cookies, parsedURL, callback) {
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

function makeProfessorLogin(res, cookies, parsedURL, callback) {
	isLoggedInAsProf(res, cookies, parsedURL,
		//callback_true
		function(ist_id, is_professor){
			console.log("Professor isLogged in as: ", ist_id);
			callback(ist_id, is_professor);
		},
		//callback_false
		function(){
			console.log("Professor isNOTlogged in.");
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
		handlePost(req, res, cookies, parsedURL, data);
	});
}

function handlePost(req, res, cookies, parsedURL, data) {
	switch(req.url) {
		case "/api/validatecode":
			isLoggedIn(res, cookies, parsedURL,
				function(ist_id) {
					var json = JSON.parse(data);
					var randomID = json.randomID;
					switch(req.url) {
						case "/api/validatecode":
							var client_code = json.input_code;
							service.validateCode(db, res, randomID, client_code, ist_id,
								function(error, result) {
									if(error) {
										sendText(res, "Error validating code.", 500);
									} else {
										sendJSON(res, result);	
									}
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
		case "/api/closeAttendance":
		case "/api/createAttendanceSession":
		case "/api/status":
		case "/api/getcode":
		case "/api/getcode/stop":
		case "/api/addmanually":
			isLoggedInAsProf(res, cookies, parsedURL,
				function(ist_id, is_professor){
					if(false == is_professor){
						sendText(res, "User not authorized.", 403);
						return;
					}
					var json = JSON.parse(data);
					var randomID = json.randomID;
					switch(req.url) {
						case "/api/closeAttendance":
							service.closeAttendance(db, randomID,
								function(status) {
									sendJSON(res, status);
								}
							);
							break;
						case "/api/status":
							service.getStatus(db, ist_id, randomID,
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
									if(error) {
										sendText(res, "Error validating code.", 500);
									} else {
										sendJSON(res, result);	
									}
								}
							);
						break;
						case "/api/createAttendanceSession":
							var json = JSON.parse(data);
							service.getAttendanceRandomID(db, ist_id, json.code_type, json.code_length, json.time, json.consecutivecodes,
								function(error, randomID, attendanceID) {
									var json_res = {};
									json_res.url = config.WEBSITE_URL + "/a?c=" + randomID;
									json_res.url_complete = config.WEBSITE_URL_COMPLETE + "/a?c=" + randomID;
									json_res.randomID = randomID;
									sendJSON(res, json_res);
								}
							);
							break;
						case "/api/addmanually":
							var json = JSON.parse(data);
							service.manuallyInsertStudent(db, json.ist_id, json.attendanceID,
								function(error){
									if(error) {
										sendText(res, "Could not manually insert student", 500);
									} else {
										sendJSON(res, "Student mannually added", 200);
									}
								});
							break;
					}
				},
				function() {
					sendText(res, "Not logged in", 403);
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

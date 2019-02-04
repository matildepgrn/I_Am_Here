var fenix_api = require('./fenix_api');

var Service = function() {};
var Code = require('./Code');

var codeByRandomID = new Map();		// randomID --> code;

Service.prototype.verifyRandomID = function(randomID) {
	var code = codeByRandomID.get(randomID);
	return (code != undefined);
}

Service.prototype.validateCode = function(db, res, randomID, client_code, ist_id, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		code.clientInput(client_code, ist_id, 
			function(error, result) {
				if(error){
					callback(error);
				} else {
					var attendanceID = code.getAttendanceID();
					var consecutive_codes = code.getConsecutiveCodes();
					db.verifyAttendance(ist_id, attendanceID, consecutive_codes,
						function(error2, isAttFinished) {
							if(error2) {
								callback(error2);
							} else {
								console.log("validateCode isAttFinished:", isAttFinished, typeof(isAttFinished));	
								var json = {};
								json.isAttFinished = (isAttFinished == 1);
								json.isCodeCorrect = result;
								callback(error, json);
								console.log("result ValidateCode:", json);
							}
						}
					); 
				}
			}
		);
	} else {
		console.log("Unknown randomID (ist_id=",ist_id + "):", randomID, typeof randomID);
		callback("Error in validateCode.", "unknown randomID");
	}
}

Service.prototype.verifyAttendance = function(db, ist_id, attendanceID, consecutive_codes) {
	db.verifyAttendance(ist_id, attendanceID, consecutive_codes,
		function(error, consecutive_codes) {
			console.log('verifyAttendance:', attendanceID);
			callback(consecutive_codes);
		}
	); 
}

Service.prototype.getStatus = function(ist_id, randomID, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		callback(code.status());	
	} else {
		console.log("Unknown randomID (ist_id=",ist_id + "):", randomID);
		callback("Error in getStatus.");
	}
}

Service.prototype.generateCode = function(ist_id, randomID, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		callback(code.newCode());	
	} else {
		console.log("Unknown randomID (ist_id=",ist_id + "):", randomID);
		callback("Error in generateCode.");
	}
}

Service.prototype.stopProcess = function(ist_id, randomID, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		callback(code.stopProcess());	
	} else {
		console.log("Unknown randomID (ist_id=",ist_id + "):", randomID);
		callback("Error in stopProcess.");
	}
}

Service.prototype.getAccessToken = function(db, res, fenix_code, callback) {
	var that = this;
	fenix_api.requestAccessToken(fenix_code, 
		function(error, access_token, refresh_token) {
			console.log("requestAccessToken: ", access_token, refresh_token);
			fenix_api.getUserInfo(access_token, refresh_token,
				function(error, info, isProfessor) {
					db.insertUser(info.username, access_token, refresh_token, info.name,
						function(error, iamhere_token){
							if(isProfessor) {
								fenix_api.getCourseInfo(access_token, refresh_token,
									function(error, body) {
										var info_teaching = body["teaching"];
										for(let k = 0; k < info_teaching.length; k++) {
											db.insertProfessorandCourse(info.username, info_teaching[k]["acronym"], info_teaching[k]["name"], info_teaching[k]["academicTerm"],
												function(error) {
													callback(iamhere_token);
												}
											);
										}
									}
								)
							} else {
								callback(iamhere_token);
							}
						}
					);
				}
			);
		}
	);
}

Service.prototype.selectCourseInfo = function(db, ist_id) {
	db.selectCourseInfo(ist_id, function(err, rows) {
		callback(rows);
	});
}


Service.prototype.getCourseInfo = function(db, res, fenix_code, access_token, refresh_token, callback) {
	fenix_api.getCourseInfo(access_token, refresh_token,
		function(error, info) {
			var info_teaching = info["teaching"];
			if(!info_teaching || !info_teaching.length || info_teaching.length == 0) {
				callback(error);
			} else {
				for(let k = 0; k < info_teaching.length; k++) {
					db.insertCourse(info_teaching[k]["acronym"], info_teaching[k]["name"], info_teaching[k]["academicTerm"],
						function(error) {}
					);
				}
			}	//todo handle better
			callback(info_teaching);
		}
	);
}


//TODO
Service.prototype.verifyLogin = function(db, iamhere_token, callback) {
	db.getUserByToken(iamhere_token,
		function(error, ist_id) {
			console.log('verifyLogin: ist_id = ', ist_id);
			callback(ist_id);
		}
	); 
}

Service.prototype.getUserName = function(db, ist_id, callback) {
	db.getUserName(ist_id,
		function(error, name) {
			console.log('getUserName: name = ', name);
			callback(name);
		}
	); 
}

Service.prototype.getAttendanceRandomID = function(db, code_type, code_length, total_time_s, consecutive_codes, callback) {
	var randomID;
	do {
		randomID = Math.floor(Math.random() * Math.floor(999999));
	} while(codeByRandomID.has(randomID));
	codeByRandomID.set(randomID, null);

	db.generateRandomAttendanceCode(randomID, code_type, code_length, total_time_s, consecutive_codes,
		function(error, attendanceID) {
			var new_code = new Code(db, randomID, attendanceID);
			new_code.customizeTest(code_length, code_type, total_time_s, consecutive_codes);
			codeByRandomID.set(randomID, new_code);
			console.log('getAttendanceRandomID: randomID = ', randomID, typeof randomID);
			console.log(attendanceID);
			callback(error, randomID, attendanceID);
		}
	); 
}

Service.prototype.closeAttendance = function(db, randomID, callback) {
	db.closeAttendance(randomID,
		function(error, success) {
			console.log('closeAttendance: response = ', success);
			callback(error, success);
		}
	); 
}


Service.prototype.removeIAmHereToken = function(db, ist_id, callback) {
	db.removeIAmHereToken(ist_id,
		function(error, success) {
			console.log('removeIAmHereToken: response = ', success);
			callback(error, success);
		}
	); 
}


module.exports = Service;
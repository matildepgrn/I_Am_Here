var fenix_api = require('./fenix_api');

var Service = function() {};
var Code = require('./Code');

var codeByRandomID = new Map();		// randomID --> code;

Service.prototype.validateCode = function(db, res, randomID, client_code, ist_id, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		code.clientInput(client_code, ist_id, 
			function(error, result) {
				if(error){
					callback(error);
				} else {
					callback(error, result);
					console.log("result ValidateCode:", result);
				}
			}
		);
	} else {
		console.log("Unknown randomID (ist_id=",ist_id + "):", randomID, typeof randomID);
		callback("Error in validateCode.", "unknown randomID");
	}
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
	console.log("getAccessToken(", fenix_code + ")");
	fenix_api.requestAccessToken(fenix_code, 
		function(error, access_token, refresh_token) {
			console.log("requestAccessToken: ", access_token, refresh_token);
			fenix_api.getUserInfo(access_token, refresh_token,
				function(error, info, isProfessor) {
					db.insertUser(info.username, access_token, refresh_token, info.name,
						function(error, iamhere_token){
							if(isProfessor) {
								db.insertProfessor(info.username,
									function(error){
										callback(iamhere_token);
									}
								);
							}else{
								callback(iamhere_token);
							}
						}
					);
				}
			);
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

Service.prototype.getAttendanceRandomID = function(db, code_type, code_length, total_time_s, consecutive_codes, classnumber, callback) {
	var randomID;
	do {
		randomID = Math.floor(Math.random() * Math.floor(999999));
	} while(codeByRandomID.has(randomID));
	codeByRandomID.set(randomID, null);

	db.generateRandomAttendanceCode(randomID, code_type, code_length, total_time_s, consecutive_codes, classnumber,
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




Service.prototype.removeIAmHereToken = function(db, ist_id, callback) {
	db.removeIAmHereToken(ist_id,
		function(error, success) {
			console.log('removeIAmHereToken: response = ', success);
			callback(error, success);
		}
	); 
}


module.exports = Service;
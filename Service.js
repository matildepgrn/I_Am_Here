var fenix_api = require('./fenix_api');

var Service = function() {};

Service.prototype.validateCode = function(db, res, code, client_code, ist_id, callback) {
	code.clientInput(client_code, ist_id, 
		function(error, result) {
			if(error){
				callback(error);
			} else {
				callback(error, result);
			}
		}
	);
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

Service.prototype.getAttendanceRandomID = function(db, code_type, code_length, total_time_s, consecutive_codes, callback) {
	db.generateRandomAttendanceCode(code_type, code_length, total_time_s, consecutive_codes,
		function(error, randomID) {
			console.log('getAttendanceRandomID: randomID = ', randomID);
			callback(error, randomID);
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
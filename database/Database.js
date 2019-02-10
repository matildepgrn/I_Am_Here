var mysql = require('mysql');
var crypto = require('crypto');
var moment = require('moment');

var database = function(connectionLimit, host, user, password, database) {
	this.pool = mysql.createPool({
		connectionLimit 	: connectionLimit,
		host				: host,
		user 				: user,
		password 			: password,
		database 			: database

});
}

//database.prototype.getConnection(func) 
//checkLogin

database.prototype.insertUser = function(user_id, access_token, refresh_token, name, callback) {
	var sql = "INSERT INTO User (ist_id, access_token, refresh_token, name, iamhere_token, creation) VALUES (?,?,?,?,?,?) \
	ON DUPLICATE KEY UPDATE access_token = ?, refresh_token = ?, name = ?, iamhere_token =?, creation = ?;";
	var iamhere_token = randomInt(32);
	var creation = moment().format('YYYY-MM-DD HH:mm:ss');
	var args = [user_id, access_token, refresh_token, name, iamhere_token, creation,
					access_token, refresh_token, name, iamhere_token, creation];

	this.pool.query(sql, args, function (err, result) {
		if (err){
			console.log("Error in the insertion of a user:", err);
			callback(err);
		}
		else{
			callback(err, iamhere_token);
		}
	});
}

database.prototype.isProfessor = function(ist_id, callback) {
	var sql = "SELECT ist_id from Professor WHERE ist_id = ?";
	var args = [ist_id];

	this.pool.query(sql, args, function (err, rows, fields) {
		if (err){
			console.log("Error verifying if is professor", err);
			callback(err);
		}
		else {
			callback(err, rows.length > 0);
		}
	});

}

database.prototype.insertProfessorandCourse = function(ist_id, courseID, courseName, academicTerm, callback) {
	var sql = "CALL InsertProfessorandCourse(?,?,?,?);";
	var args = [ist_id, courseID, courseName, academicTerm];

	this.pool.query(sql, args, function (err, result) {
		if (err){
			console.log("Error in the insertion of a professor and course:", err);
			callback(err);
		}
		else{
			callback(err);
		}
	});
}

database.prototype.updateAccessToken = function(access_token, refresh_token, newAccessToken, callback) {
	var sql = "UPDATE User SET access_token = ? WHERE access_token = ? AND refresh_token = ?;";
	var args = [newAccessToken, access_token, refresh_token];
	this.pool.query(sql, args, function (err, result) {
		if (err){
			console.log("Error in the insertion of a new access token.");
			callback(err);
		}
		else{
			callback(err, newAccessToken);
		}
	});
}

database.prototype.getUserByToken = function(iamhere_token, callback) {
	var sql = "SELECT ist_id FROM User WHERE iamhere_token = ?;";
	var arg = [iamhere_token];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error getting the ist_id.");
			callback(err);
		}
		else if(rows.length < 1) {
			console.log("getUserByToken: empty row.", rows);
			callback(err);
		}
		else {
			callback(err, rows[0].ist_id);
		}
	})
};

database.prototype.getUserName = function(ist_id, callback) {
	var sql = "SELECT name FROM User WHERE ist_id = ?";
	var arg = [ist_id];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error getting the user name.");
			callback(err);
		}
		else{
			callback(err, rows[0].name);
		}
	})
};

database.prototype.removeIAmHereToken = function(ist_id, callback) {
	var sql = "UPDATE User SET iamhere_token = null WHERE ist_id = ?;";
	var arg = [ist_id];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error updating the iamhere_token.");
			callback(err, false);
		}
		else{
			callback(err, true);
		}
	})
};


database.prototype.closeAttendance = function(randomID, callback) {
	var sql = "UPDATE Attendance SET open = false WHERE randomID = ?;";
	var arg = [randomID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error closing Attendance.");
			callback(err, false);
		}
		else{
			console.log("Attendance closed.");
			callback(err, true);
		}
	})
};

database.prototype.generateRandomAttendanceCode = function(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, callback) {
	//var sql = "INSERT INTO Attendance(randomID, code_type, code_length, total_time_s, consecutive_codes) VALUES(?, ?, ?, ?, ?);";
	var sql = "CALL AttendanceMapping(?,?,?,?,?,?,?,?);";
	var date = moment().format('YYYY-MM-DD HH:mm:ss');
	var arg = [ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, date, true];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error updating the randomID.", err);
			callback(err);
		}
		else{
			callback(err, rows[0][0].attendanceID);
		}
	})
};

database.prototype.insertCode = function(ist_id, code_generated, code_input, time_taken_s, sequence, attendanceID, callback) {
	var sql = "INSERT INTO Code(date_input, ist_id, code_input, correct, time_taken_s, sequence, attendanceID) VALUES(?,?,?,?,?,?,?);";
	var correct = (code_generated == code_input);

	var arg = [moment().format('YYYY-MM-DD HH:mm:ss'), ist_id, code_input, correct, time_taken_s, sequence, attendanceID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error inserting code:", err);
		}
		else{
		}
		callback(err, code_input);
	})
};

database.prototype.insertCodeServer = function(server_code, sequence, attendanceID, callback) {
	var sql = "INSERT INTO CodeAttendance(server_code, sequence, attendanceID) VALUES(?,?,?)";
	var arg = [server_code, sequence, attendanceID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error inserting server code.");
			callback(err);
		}
		else{
			callback(err);
		}
	})
};

database.prototype.insertFingerprintData = function(ist_id, useragent, ip, callback) {
	var sql = "INSERT INTO FingerprintData(ist_id, useragent, ip) VALUES(?,?,?)";
	var arg = [ist_id, useragent, ip];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error inserting fingerprintdata.", err);
			callback(err);
		}
		else{
			callback(err);
		}
	})
};

database.prototype.manuallyInsertStudent = function(ist_id, attendanceID, callback) {
	var sql = "CALL InsertStudentToAttendance(?,?)";
	var arg = [ist_id, attendanceID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error inserting student manually.", err);
			callback(err);
		}
		else{
			callback(err);
		}
	})
};

database.prototype.checkFingerprint = function(attendanceID, callback) {
	var sql = "CALL CheckFingerprint(?,?);";
	var arg = [attendanceID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error checking fingerprint", err);
			callback(err);
		}
		else{
			callback(err, rows);
		}
	})
};

database.prototype.getFingerprintData = function(ist_id, attendanceID, callback) {
	var sql = "CALL GetFingerprintInfo(?,?);";
	var arg = [ist_id, attendanceID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error getting fingerprint data", err);
			callback(err);
		}
		else{
			callback(err, rows[0]);
		}
	})
};

database.prototype.createClass = function(ist_id, courseID, callback) {
	var sql = "INSERT INTO Class(ist_id, courseID) VALUES (?,?);";
	var arg = [ist_id, randomID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if(err) {
			console.log("Error in createClass:", err);
			callback(err);
		} else {
			callback(err);
		}
	})
};

database.prototype.getAttendanceHistory = function(ist_id, callback) {
	var sql = "SELECT date, code_type, code_length, total_time_s, consecutive_codes, attendanceID FROM Attendance WHERE ist_id = ?;";
	var arg = [ist_id];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if(err) {
			console.log("Error in getAttendanceHistory:", err);
			callback(err);
		} else {
			callback(err, rows);
		}
	})
};

database.prototype.getClassHistory = function(attendanceID, callback) {
	var sql = "SELECT ah.ist_id, u.name from AttendanceHistory ah, User u WHERE ah.attendanceID = ? and u.ist_id = ah.ist_id;";
	var arg = [attendanceID];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if(err) {
			console.log("Error in getClassHistory:", err);
			callback(err);
		} else {
			callback(err, rows);
		}
	})
};

database.prototype.selectCourseInfo = function(ist_id, callback) {
	var sql = "SELECT c.academicTerm, c.courseName, c.courseID FROM Professor as p, Course as c WHERE  p.ist_id = ? ORDER BY courseName;";
	var arg = [ist_id];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if(err) {
			console.log("Error in selectCourseInfo:", err);
			callback(err);
		} else {
			callback(err, rows);
		}
	})
};


database.prototype.verifyAttendance = function (ist_id, attendanceID, consecutive_codes, callback) {
	var sql = "SELECT CheckAttendance(?,?,?) AS result";
	var arg = [attendanceID, ist_id, consecutive_codes];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if(err) {
			console.log("Error in verifyAttendance:", err);
			callback(err);
		} else {
			callback(err, rows[0].result);
		}
	})
};


function randomInt(size){
	return crypto.randomBytes(size).toString('hex');
};

module.exports = database;
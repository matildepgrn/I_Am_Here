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
	var sql = "REPLACE INTO User (ist_id, access_token, refresh_token, name, iamhere_token, creation) VALUES (?,?,?,?,?,?);";
	var iamhere_token = randomInt(32);
	var args = [user_id, access_token, refresh_token, name, iamhere_token, moment().format('YYYY-MM-DD HH:mm:ss')];
	this.pool.query(sql, args, function (err, result) {
		if (err){
			console.log("Error in the insertion of a user.");
			callback(err);
		}
		else{
			console.log("1 user inserted.");
			callback(err, iamhere_token);
		}
	});
}

database.prototype.insertProfessor = function(user_id, callback) {
	var sql = "REPLACE INTO Professor (ist_id) VALUES (?);";
	var args = [user_id];
	this.pool.query(sql, args, function (err, result) {
		if (err){
			console.log("Error in the insertion of a professor.");
		}
		else{
			console.log("1 professor inserted.");
		}
		callback(err);
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
			console.log("New access token inserted.");
			callback(err, newAccessToken);
		}
	});
}

database.prototype.getUserByToken = function(iamhere_token, callback) {
	var sql = "SELECT ist_id FROM User WHERE iamhere_token = ?";
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
			console.log("1 ist_id sent");
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
			console.log("1 user name sent");
			callback(err, rows[0].name);
		}
	})
};

database.prototype.removeIAmHereToken = function(ist_id, callback) {
	var sql = "UPDATE User SET iamhere_token = null WHERE ist_id = ?";
	var arg = [ist_id];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error updating the iamhere_token.");
			callback(err, false);
		}
		else{
			console.log("iamhere_token removed.");
			callback(err, true);
		}
	})
};

database.prototype.generateRandomAttendanceCode = function(code_type, code_length, total_time_s, consecutive_codes, callback) {
	var sql = "INSERT INTO Attendance(randomID, code_type, code_length, total_time_s, consecutive_codes) VALUES(?, ?, ?, ?, ?)";
	var randomID = Math.floor(Math.random() * Math.floor(999999));
	var arg = [randomID, code_type, code_length, total_time_s, consecutive_codes];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error updating the randomID.");
			callback(err);
		}
		else{
			console.log("randomID updated.");
			callback(err, randomID);
		}
	})
};

database.prototype.insertCode = function(date_input, ist_id, code_generated, code_input, code_generated, time_taken_s) {
	var sql = "INSERT INTO Code(date_input, ist_id, code_input, correct, code_generated, time_taken_s VALUES(?,?,?,?,?,?)";
	var correct = (code_generated == code_input);

	var arg = [moment().format('YYYY-MM-DD HH:mm:ss'), ist_id, code_input, correct, code_generated, time_taken_s];

	this.pool.query(sql, arg, function(err, rows, fields) {
		if (err){
			console.log("Error inserting code.");
			callback(err);
		}
		else{
			console.log("code inserted.");
			callback(err);
		}
	})
};





function randomInt(size){
	return crypto.randomBytes(size).toString('hex');
}

module.exports = database;
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

database.prototype.insertUser = function(user_id, access_token, refresh_token) {
	var sql = "REPLACE INTO User (ist_id, access_token, refresh_token, iamhere_token, creation) VALUES (?,?,?,?,?);";
	var args = [user_id, access_token, refresh_token, randomInt(32), moment().format('YYYY-MM-DD HH:mm:ss')];
	this.pool.query(sql, args, function (err, result) {
		if (err){
			console.log("Error in the insertion of a user.");
		}
		else{
			console.log("1 user inserted.");
		}
	});
}

function randomInt(size){
	return crypto.randomBytes(size).toString('hex');
}

module.exports = database;
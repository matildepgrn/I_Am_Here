var fenix_api = require('./fenix_api');

var Service = function() {};

Service.prototype.getAccessToken = function(db, res, fenix_code, callback) {
	fenix_api.requestAccessToken(fenix_code, 
		function(error, access_token, refresh_token) {
			fenix_api.getUserInfo(access_token, refresh_token,
				function(error, info) {
					db.insertUser(info.username, access_token, refresh_token, info.name,
						function(error, iamhere_token){
							callback(iamhere_token);
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




module.exports = Service;
var fenix_api = require('./fenix_api');

var Service = function() {};

Service.prototype.getAccessToken = function(db, res, fenix_code) {
	fenix_api.requestAccessToken(res, fenix_code, 
		function(error, access_token, refresh_token) {
			fenix_api.getUserID(access_token,
				function(error, user_id) {
					db.insertUser(user_id, access_token, refresh_token);
				}
			); 
		}
	);
}


module.exports = Service;
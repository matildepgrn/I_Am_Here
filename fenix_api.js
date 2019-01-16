module.exports = {
	requestAccessToken: requestAccessToken,
	getUserID: getUserID,
};

var request = require('request');
var config = require('./default_config');
var moment = require('moment');

function requestAccessToken(res, fenix_code, callback){
	request.post(
		'https://fenix.tecnico.ulisboa.pt/oauth/access_token?' +
		'client_id=' + encodeURIComponent(config.client_id) +
		'&client_secret=' + encodeURIComponent(config.client_secret) +
		'&redirect_uri=' + encodeURIComponent('https://testhere.duckdns.org:9080/oauth') +
		'&code=' + encodeURIComponent(fenix_code) +
		'&grant_type=authorization_code',
		{ json: {key: ' '}},

			function (error, response, body) {
				if(!error && response.statusCode == 200) {
					callback(error, body.access_token, body.refresh_token);
				} else { //TODO handle this better
					callback(error);
					console.log('Erro.');
				}
			}
		);

}

function getUserID(access_token, callback) {
	request
		({url:'https://fenix.tecnico.ulisboa.pt/api/fenix/v1/person?access_token=' + encodeURIComponent(access_token), json: true}
			, function(error, response, body) {
				if(response.statusCode == 200) {
					var user_id = body.username;
					callback(error, user_id);
				} else { //TODO handle this better
					console.log('Error.');
					callback(error);
				}
			});
}

module.exports = {
	requestAccessToken: requestAccessToken,
	getUserInfo: getUserInfo,
	getCourseInfo: getCourseInfo,
};

var request = require('request');
var config = require('./default_config');
var moment = require('moment');

function requestAccessToken(fenix_code, callback){
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
					console.log('Erro no requestAccessToken().', response.statusCode, error);
				}
			}
		);

}

function getUserInfo(access_token, refresh_token, callback) {
	request
		({url:'https://fenix.tecnico.ulisboa.pt/api/fenix/v1/person?access_token=' + encodeURIComponent(access_token), json: true}
			, function(error, response, body) {
				if(response.statusCode == 200) {
					callback(error, body, isProfessor(body));
				} else if(response.statusCode == 401 && body
					&& body.error && body.error == 'accessTokenExpired') {
						console.log('Error - getUserInfo: Requires new access token.');
						//TODO
				} else { //TODO handle this better
					console.log('Erro no getUserInfo().', response.statusCode, error);
					callback(error);
				}
			});
}

function isProfessor(body){
	for(var i = 0; i < body.roles.length; i++) {
		if(body.roles[i].type == 'TEACHER'){
			return true;
		}
	}
	return false;
}

function getCourseInfo(access_token, refresh_token, callback){
	request
		({url:'https://fenix.tecnico.ulisboa.pt/api/fenix/v1/person/courses?access_token=' + encodeURIComponent(access_token), json: true}
			, function(error, response, body) {
				if(response.statusCode == 200) {
					callback(error, body);
				} else if(response.statusCode == 401 && body
					&& body.error && body.error == 'accessTokenExpired') {
						console.log('Error - getUserInfo: Requires new access token.');
				} else {
					console.log('Erro no getCourseInfo.', response.statusCode, error);
					callback(error);
				}
			});
}


function refreshAccessToken(refresh_token, callback){
	request.post(
		'https://fenix.tecnico.ulisboa.pt/oauth/refresh_token?' +
		'client_id=' + encodeURIComponent(config.client_id) +
		'&client_secret=' + encodeURIComponent(config.client_secret) +
		'&refresh_token=' + encodeURIComponent(refresh_token) +
		'&grant_type=refresh_token',
		{ json: {key: ' '}},

			function (error, response, body) {
				if(!error && response.statusCode == 200) {
					callback(error, body.access_token);
				} else { //TODO handle this better
					callback(error);
					console.log('Erro no refreshAccessToken().', response.statusCode, error, body);
				}
			}
		);

}
//TODO verify roles[x].type (verificar se algum x tem "TEACHER")

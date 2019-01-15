module.exports = {
	requestAccessToken: requestAccessToken,
	redirectURL: redirectURL,
	insertIntoDB: insertIntoDB
};

var request = require('request');
var config = require('./default_config');
var moment = require('moment');

function redirectURL(res, url) {
	res.writeHead(301,
		{Location: url}
	);
	res.end();
}

function requestAccessToken(con, res, fenix_code){
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
					console.log(body);
					console.log(response);
					redirectURL(res, "/student");

					insertIntoDB(con, body);
						
					}
				}
			);

}

function insertIntoDB(con, body) {
	request
		({url:'https://fenix.tecnico.ulisboa.pt/api/fenix/v1/person?access_token=' + encodeURIComponent(body.access_token), json: true}
			, function(error1, response1, body1) {
				if(response1.statusCode == 200) {
					var user_id = body1.username;
						
					var sql = "REPLACE INTO User (ist_id, access_token, refresh_token, creation) VALUES (" +
						"'" + user_id + "'" + "," +
						"'" + body.access_token + "'" + "," +
						"'" + body.refresh_token + "'" + "," +
						"'" + moment().format('YYYY-MM-DD HH:mm:ss') + "'" + ")";

						con.query(sql, function (err, result) {
							if (err){
								console.log("Error in the insertion of a user.");
							}
							else{
								console.log("1 user inserted.");
							}
						});
					
				}
			});

}

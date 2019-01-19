module.exports = {
	newCode: newCode,
	status: status,
	stopProcess: stop,
	validateCode: clientInput,
	customizeTest: customizeTest
};

var fs = require('fs');
var running = false;
var time_ms = 0;
var x = null;
var INTERVAL = 10*1000; // ms
var NUM_CHAR = 7 // num caracteres
var CODE_TYPE = "LN"; //L, N, LN
var repetitions = 5; 
var code_counter = 0;
var current_code = '';
var CSV_SEPARATOR = ",";
var stream = initStream("test.csv");

function newCode() {
	startProcess();
	return status();
}

function stop() {
	stopProcess();
	return status();
}

// letters and numbers
var LN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
var L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; 
var N = "0123456789";

function randomCode() {
	var text = "";
	var possible = "";
	switch(CODE_TYPE){
		case "LN":
			possible = LN;
			break;
		case "L":
			possible = L;
			break;
		case "N":
			possible = N;
			break;
		default:
			break;
	}
	
	for (var i = 0; i < NUM_CHAR; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

function customizeTest(num_char, code_type, time, consecutive_codes){
	console.log("customizeTest", num_char, code_type, time, consecutive_codes);
	NUM_CHAR = num_char;
	CODE_TYPE = code_type;
	INTERVAL = time*1000;
	repetitions = consecutive_codes;
} 

function status() {
	return {
		current_code: current_code,
		code_counter: code_counter,
		time_ms: time_ms/1000,
		running: running
	};
}

function timer_function() {
	time_ms = time_ms - 1*1000;

	if (time_ms <= 0) {
		clearInterval(x);
		x = null;
		
		if(repetitions-- > 1) {
			startCountdown();
		}
		else {
			current_code = "Expired";
			running = false;
		}
	}
}

function startCountdown() {
	if(x != null) {
		clearInterval(x);
	}

	time_ms = INTERVAL;
	current_code = randomCode();
	code_counter++;
	x = setInterval(timer_function, 1000);
}

function stopProcess() {
	if(x != null) {
		clearInterval(x);
	}
	running = false;
}

function startProcess() {
	repetitions = 5; 
	code_counter = 0;
	running = true;
	startCountdown();
}

function clientInput(code_client){
	appendToFile(code_client);
	return validateCode(code_client);
}

function validateCode(code_client){
	if(current_code == code_client && current_code != ""){
		return true;
	}
	else {
		return false;
	}
}

function initStream(filename) {
	var exists = false;
	try {
		fs.accessSync(filename, fs.constants.R_OK | fs.constants.W_OK);
		exists = true;
	} catch (err) {
		exists = false;
	}
	var stream = fs.createWriteStream(filename, {flags:'a'});
	if(exists == false) {
		stream.write("Date" + CSV_SEPARATOR +
			"Total_time_s" + CSV_SEPARATOR +
			"Code_length" + CSV_SEPARATOR +
			"Code_type" + CSV_SEPARATOR +
			"Code_generated" + CSV_SEPARATOR +
			"Code_input" + CSV_SEPARATOR +
			"Correct" + CSV_SEPARATOR +
			"Time_left_s" + "\n"
		);
	}
	return stream;
}

// Date Total_time_s Code_length Code_type Code_generated Code_input Correct Time_left_s
function appendToFile(code_client) {
	stream.write(new Date() + CSV_SEPARATOR +
		INTERVAL/1000 + CSV_SEPARATOR +
		NUM_CHAR + CSV_SEPARATOR +
		CODE_TYPE + CSV_SEPARATOR +
		current_code + CSV_SEPARATOR +
		code_client + CSV_SEPARATOR +
		validateCode(code_client) + CSV_SEPARATOR +
		time_ms/1000 + "\n"
	);
}

module.exports = {
	newCode: newCode,
	status: status,
	stopProcess: stop,
	validateCode: validateCode
};

var running = false;
var time_ms = 0;
var x = null;
var INTERVAL = 10*1000; // ms
var NUM_CHAR = 7 // num caracteres
var repetitions = 5; 
var code_counter = 0;
var current_code = '';

function newCode() {
	startProcess();
	return status();
}

function stop() {
	stopProcess();
	return status();
}

function randomCode() {
	var text = "";
	var possible_all = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	for (var i = 0; i < NUM_CHAR; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
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
			current_code = "EXPIRED";
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

function validateCode(code_client){
	if(current_code == code_client && current_code != ""){
		return true;
	}
	else {
		return false;
	}
}


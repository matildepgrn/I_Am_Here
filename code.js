module.exports = {
	newCode: newCode,
	status: status
};

var time_ms = 0;
var x = null;
var INTERVAL = 7*1000;
var repetitions = 5; 
var code_counter = 1;
var current_code = '';

function newCode() {
	startProcess();
	return status();
}

function randomCode() {
	var text = "";
	var possible_all = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	for (var i = 0; i < 7; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

function status() {
	return {
		current_code: current_code,
		repetitions_left: repetitions,
		code_counter: code_counter,
		time_ms: time_ms
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

function startProcess() {
	repetitions = 5; 
	code_counter = 1;
	startCountdown();
}


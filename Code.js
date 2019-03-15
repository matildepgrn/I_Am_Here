var fs = require('fs');

var Code = function(db, randomID, attendanceID) {
	this.randomID = randomID;
	this.attendanceID = attendanceID;
	this.running = false;
	this.time_ms = 0;
	this.x = null;
	this.INTERVAL = 10*1000; // ms
	this.NUM_CHAR = 7 // num caracteres
	this.CODE_TYPE = "LN"; //L, N, LN
	//this.repetitions = 5;
	this.current_code = '';
	this.code_counter = 0;
	this.db = db;
	this.studentsList = [];
};

var CSV_SEPARATOR = ",";
var stream = initStream("test.csv");

Code.prototype.newCode = function() {
	this.startProcess();
	return this.status();
}

Code.prototype.getAttendanceID = function() {
	return this.attendanceID;
}

Code.prototype.getConsecutiveCodes = function() {
	return this.repetitions;
}

Code.prototype.stop = function() {
	this.stopProcess();
	this.running = false;
	return this.status();
}

// letters and numbers
var LN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
var L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; 
var N = "0123456789";

Code.prototype.randomCode = function() {
	var text = "";
	var possible = "";
	switch(this.CODE_TYPE){
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
	
	for (var i = 0; i < this.NUM_CHAR; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

Code.prototype.customizeTest = function(num_char, code_type, time, consecutive_codes){
	this.NUM_CHAR = num_char;
	this.CODE_TYPE = code_type;
	this.INTERVAL = time*1000;
	this.repetitions = consecutive_codes;
} 

Code.prototype.status = function() {
	return {
		current_code: this.current_code,
		code_counter: this.code_counter,
		time_ms: this.time_ms/1000,
		running: this.running,
		studentsList: this.studentsList
	};
}

Code.prototype.timer_function = function() {
	this.time_ms = this.time_ms - 1*1000;

	if (this.time_ms <= 0) {
		clearInterval(this.x);
		this.x = null;
		
		//if(repetitions-- > 1) {
		this.startCountdown();
		//}
		//else {
		//	current_code = "Expired";
		//	running = false;
		//}
	}
}

Code.prototype.startCountdown = function() {
	if(this.x != null) {
		clearInterval(this.x);
	}

	this.time_ms = this.INTERVAL;
	this.nextCode();
	var that = this;
	this.x = setInterval(function(){that.timer_function()}, 1000);
}

Code.prototype.nextCode = function() {
	this.current_code = this.randomCode();
	this.code_counter++;
	this.db.insertCodeServer(this.current_code, this.code_counter, this.attendanceID,
		function(err) {}
	);
}

Code.prototype.stopProcess = function() {
	if(this.x != null) {
		clearInterval(this.x);
	}
	this.running = false;
	return this.status();
}

Code.prototype.startProcess = function() {
	this.running = true;
	this.startCountdown();
}

Code.prototype.clientInput = function(code_client, ist_id, callback){
	var result = this.validateCode(code_client);
	console.log("clientInput", result);

	this.db.insertCode(ist_id, this.current_code, code_client, this.time_ms/1000, this.code_counter, this.attendanceID,
		function(error, code_client) {
			console.log('clientInput: code = ', code_client);
			callback(error, result);
		}
	);
}

Code.prototype.validateCode = function(code_client){
	if(this.current_code == code_client && this.current_code != ""){
		return true;
	}
	else {
		return false;
	}
}

Code.prototype.insertStudent = function(ist_id){
	if(!this.studentsList.includes(ist_id)){
		this.studentsList.unshift(ist_id);
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
		this.INTERVAL/1000 + CSV_SEPARATOR +
		this.NUM_CHAR + CSV_SEPARATOR +
		this.CODE_TYPE + CSV_SEPARATOR +
		this.current_code + CSV_SEPARATOR +
		code_client + CSV_SEPARATOR +
		validateCode(code_client) + CSV_SEPARATOR +
		this.time_ms/1000 + "\n"
	);
}

module.exports = Code;
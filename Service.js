var fenix_api = require('./fenix_api');

var Service = function() {};
var Code = require('./Code');
var CSV_SEPARATOR = "\t";

var codeByRandomID = new Map();		// randomID --> code;

Service.prototype.verifyRandomID = function(db, randomID, ist_id, useragent, ip, callback) {
	var code = codeByRandomID.get(randomID);
	if(!code) {
		callback(null, false);
		return;
	}
	var attendanceID = code.getAttendanceID();
	var that = this;
	this.studentAttendanceChecked(db, ist_id, randomID,
		function(error, isChecked) {
			if(isChecked) {
				callback(null, true, true);
			} else {
				that.insertFingerprintData(db, ist_id, useragent, ip, attendanceID,
					function(error){
						callback(error, code != undefined, false);
					}
				);
			}
		}
	);
}

Service.prototype.getAttendanceTypeByRandomID = function(randomID) {
	var code = codeByRandomID.get(randomID);
	if(!code) {
		return "";	
	}
	return code.getCodeType();
}

Service.prototype.validateCode = function(db, res, randomID, client_code, ist_id, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		code.clientInput(client_code, ist_id, 
			function(error, result) {
				if(error){
					callback(error);
				} else {
					var attendanceID = code.getAttendanceID();
					var consecutive_codes = code.getConsecutiveCodes();
					db.verifyAttendance(ist_id, attendanceID, consecutive_codes,
						function(error2, isAttFinished) {
							if(error2) {
								callback(error2);
							} else {	
								var json = {};
								json.isAttFinished = (isAttFinished == 1);
								json.isCodeCorrect = result;
								if(isAttFinished) {
									code.insertStudent(ist_id);
								}
								callback(error, json);
							}
						}
					); 
				}
			}
		);
	} else {
		callback("Error in validateCode.", "unknown randomID");
	}
}

Service.prototype.verifyAttendance = function(db, ist_id, attendanceID, consecutive_codes, callback) {
	db.verifyAttendance(ist_id, attendanceID, consecutive_codes,
		function(error, consecutive_codes) {
			if(error) {
				callback(error);
			} else {
				callback(consecutive_codes);	
			}
		}
	); 
}


Service.prototype.createandinsertstudents = function(db, courseID, ist_id, is_extra, title, number, text, callback) {
	db.generateRandomAttendanceCode(ist_id, 0, null, null, null, null, courseID, is_extra, title, number,
		function(error, attendanceID) {
			if(error) {
				callback(error);
			} else {
				let split_text = text.split('\n');
				let line = 0;
				aux_manuallyInsertStudent(db, attendanceID, line, split_text, callback);
			}
		}
	); 
}

function aux_manuallyInsertStudent(db, attendanceID, line, split_text, callback) {
	if(line < split_text.length) {
		let split_line = split_text[line].split(',');
		let split_line_1 = split_line[1].trim();
		if(split_line_1 == "late") {
			db.manuallyInsertLateStudent(split_line[0], attendanceID,
				function(error) {
					line++;
					if(line < split_text.length) {
						aux_manuallyInsertStudent(db, attendanceID, line, split_text, callback);
					} else {
						callback(error);
					}
				});
		} else if(split_line_1 == "ok") {
			db.manuallyInsertStudent(split_line[0], attendanceID,
				function(error1) {
					line++;
					if(line < split_text.length) {
						aux_manuallyInsertStudent(db, attendanceID, line, split_text, callback);
					} else {
						callback(error1);
					}
				}
			);
		} else {
			console.log("Error in aux_manuallyInsertStudent.");
			callback(error);
		}
	}
}



Service.prototype.updateStudentNameAndNumber = function(db, text, callback) {
	let split_text = text.split('\n');
	let line = 0;
	aux_updateStudentNameAndNumber(db, line, split_text, callback);
}

function aux_updateStudentNameAndNumber(db, line, split_text, callback) {
	if(line < split_text.length) {
		let split_line = split_text[line].split(',');
		db.updateStudentNameAndNumber(split_line[2], split_line[1], split_line[0],
			function(error) {
				line++;
				if(line < split_text.length) {
					aux_updateStudentNameAndNumber(db, line, split_text, callback);
				} else {
					callback(error);
				}
			}
		); 
	}
}


Service.prototype.insertFingerprintData = function(db, ist_id, useragent, ip, attendanceID, callback) {
	db.insertFingerprintData(ist_id, useragent, ip, attendanceID,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.getAllAcademicTerms = function(db, ist_id, callback) {
	db.getAllAcademicTerms(ist_id,
		function(error, result) {
			callback(error, result);
		}
	); 
}

Service.prototype.deserializedAttendancesFromLastDay = function(db, callback) {
	db.deserializedAttendancesFromLastDay(
		function(error, rows) {
			db.getAttendanceSequence(
				function(error1, rows1) {
					if(error || error1) {
						callback(error);
						return;
					} 
					var attendances = [];
					for(let i = 0; i < rows.length; i++) {
						let at = rows[i];
						attendances.push(at.attendanceID);
						var code = new Code(db, at.randomID, at.attendanceID);
						for(let k of rows1) {
							if(k.attendanceID == at.attendanceID) {
								code.code_counter = k.sequence;
								break;
							}
						}
						code.customizeTest(at.code_length, at.code_type, at.total_time_s, at.consecutive_codes);
						codeByRandomID.set(at.randomID, code);

						if(at.open == 1) {
							code.startProcess();
						}
					}
					callback(error, attendances);
				}

			);
		}
	); 
}

Service.prototype.manuallyInsertStudent = function(db, ist_id, attendanceID, callback) {
	db.manuallyInsertStudent(ist_id, attendanceID,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.manuallyInsertLateStudent = function(db, ist_id, attendanceID, callback) {
	db.manuallyInsertLateStudent(ist_id, attendanceID,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.manuallyRemoveStudent = function(db, ist_id, attendanceID, callback) {
	db.manuallyRemoveStudent(ist_id, attendanceID,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.manuallyRemoveAttendance = function(db, attendanceID, ist_id, callback) {
	db.manuallyRemoveAttendance(attendanceID, ist_id,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.getProfessorsByCourse = function(db, courseID, ist_id, callback) {
	db.getProfessorsByCourse(courseID,
		function(error, rows) {
			var result = {ist_id: ist_id, rows: rows};
			if(error) {
				callback(error);
			} else {
				callback(error, result);
			}
		}
	); 
}

Service.prototype.getFingerprintData = function(db, ist_id, attendanceID, callback) {
	db.getFingerprintData(ist_id, attendanceID,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				callback(error, rows);
			}
		}
	); 
}

Service.prototype.getFingerprintDataTable = function(db, attendanceID, callback) {
	db.getFingerprintDataTable(attendanceID,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				let result = [];
				// for each ist_id
				for(let k = 0; k < rows.length; k++) {
					let ist_id = rows[k].ist_id;
					let ip = rows[k].ip;

					// for each ip
					for(let j = 0; j < rows.length; j++) {
						let next_ip = rows[j].ip;
						let next_istid = rows[j].ist_id;
						if(next_ip == ip && next_istid != ist_id) {
							if(!result.includes(next_istid)){
								result.push(next_istid);
							}
						}
					}
				}
				callback(error, result);
			}
		}
	); 
}

Service.prototype.getManuallyInsertedStudents = function(db, attendanceID, callback) {
	db.getManuallyInsertedStudents(attendanceID,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				callback(error, rows);
			}
		}
	); 
}

Service.prototype.getLateStudents = function(db, attendanceID, callback) {
	db.getLateStudents(attendanceID,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				callback(error, rows);
			}
		}
	); 
}

Service.prototype.isProfessor = function(db, ist_id, callback) {
	db.isProfessor(ist_id,
		function(error, is_professor) {
			if(error) {
				callback(error);
			} else {
				callback(error, is_professor);	
			}
		}
	); 
}

Service.prototype.getAttendanceByRandomID = function(db, ist_id, randomID, callback) {
	db.getAttendanceByRandomID(randomID, ist_id,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				callback(error, rows);	
			}
		}
	); 
}

Service.prototype.getStatus = function(db, ist_id, randomID, callback) {
	this.getCode(db, ist_id, randomID,
		function(error, code) {
			if(error) {
				callback(error);
			} else {
				callback(code.status());
			}
		}
	);
}

Service.prototype.getCode = function(db, ist_id, randomID, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		callback(null, code);	
	} else {
		db.getAttendanceByRandomID(randomID, ist_id,
			function(error, rows) {
				if(error) {
					callback(error);
				} else {
					if(rows[0]){
						var code = new Code(db, randomID, rows[0].attendanceID);
						code.customizeTest(rows[0].code_length, rows[0].code_type, rows[0].total_time_s, rows[0].consecutive_codes);
						codeByRandomID.set(randomID, code);
						code.startProcess();
						callback(null, code);
					} else {
						console.log("Error in getCode");
						callback(error);
					}
				}
			}		
		);
	}
}
	

Service.prototype.generateCode = function(ist_id, randomID, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		callback(code.newCode());	
	} else {
		callback("Error in generateCode.");
	}
}

Service.prototype.stopProcess = function(ist_id, randomID, callback) {
	var code = codeByRandomID.get(randomID);
	if(code){
		callback(code.stopProcess());	
	} else {
		callback("Error in stopProcess.");
	}
}

Service.prototype.getAccessToken = function(db, res, fenix_code, callback) {
	var that = this;
	fenix_api.requestAccessToken(fenix_code, 
		function(error, access_token, refresh_token) {
			fenix_api.getUserInfo(access_token, refresh_token,
				function(error, info, isProfessor) {
					if(error) {
						callback("getAccessToken error",error);
					} else {
						db.insertUser(info.username, access_token, refresh_token, info.name,
							function(error, iamhere_token){
								if(isProfessor) {
									fenix_api.getCourseInfo(access_token, refresh_token,
										function(error, body) {
											var info_teaching = body["teaching"];
											for(let k = 0; k < info_teaching.length; k++) {
												db.insertProfessorandCourse(info.username, info_teaching[k]["acronym"], info_teaching[k]["name"], info_teaching[k]["academicTerm"],
													function(error) {
														callback(iamhere_token);
													}
												);
											}
										}
									)
								} else {
									callback(iamhere_token);
								}
							}
						);
					}
				}
			);
		}
	);
};

Service.prototype.studentAttendanceChecked = function(db, ist_id, randomID, callback) {
	db.studentAttendanceChecked(ist_id, randomID, function(err, isChecked) {
		if(err) {
			callback(err);
		} else {
			callback(err, isChecked);
		}
	});
};

Service.prototype.selectCourseInfo = function(db, ist_id, academicTerm, callback) {
	db.selectCourseInfo(ist_id, academicTerm,
		function(err, rows) {
			if(err) {
				callback(err);
			} else {
				callback(err, rows);
			}
	});
};

Service.prototype.getAttendanceHistory = function(db, ist_id, courseID, callback) {
	db.getAttendanceHistory(ist_id, courseID, function(err, res) {
		if(err) {
			callback(err);
		} else {
			db.getCourseName(courseID, function(err1, res1) {
				if(err1) {
					callback(err1);
				} else {
					var json = {history: res,
								courseName: res1.courseName};

					callback(err1, json);
				}
			});
		}
	});
};

Service.prototype.getClassHistory = function(db, attendanceID, callback) {
	let thisService = this;
	db.getClassHistory(attendanceID, function(err, rows) {
		if(err) {
			callback(err);
		} else {
			thisService.getFingerprintDataTable(db, attendanceID, 
			//db.checkFingerprint(attendanceID,
				function(error, rows_fingerprints) {
					if(error) {
						callback(error);
					} else {
						db.getStudentsThatTried(attendanceID,
							function(error2, rows_studentsThatTried) {
								if(error2) {
									callback(error2);
								} else {
									thisService.getManuallyInsertedStudents(db, attendanceID,
										function(error3, rows_manually) {
											if(error3) {
												callback(error3);
											} else {
												thisService.getLateStudents(db, attendanceID,
													function(error4, rows_late) {
														if(error4) {
															callback(error4);
														} else {
															var o = {attendanceID: attendanceID,
															rows: rows,
															rows_fingerprints: rows_fingerprints,
															rows_studentsThatTried: rows_studentsThatTried,
															rows_manually: rows_manually,
															rows_late: rows_late};
															callback(null, o);
														}
													}

												)
											}
										}
									)
								}
							}
						)
					}
				}
			);
		}
	});
};

Service.prototype.getCourseInfo = function(db, res, fenix_code, access_token, refresh_token, callback) {
	fenix_api.getCourseInfo(access_token, refresh_token,
		function(error, info) {
			var info_teaching = info["teaching"];
			if(!info_teaching || !info_teaching.length || info_teaching.length == 0) {
				callback(error);
			} else {
				for(let k = 0; k < info_teaching.length; k++) {
					db.insertCourse(info_teaching[k]["acronym"], info_teaching[k]["name"], info_teaching[k]["academicTerm"],
						function(error) {}
					);
				}
			}	//todo handle better
			callback(info_teaching);
		}
	);
}


//TODO
Service.prototype.verifyLogin = function(db, iamhere_token, callback) {
	db.getUserByToken(iamhere_token,
		function(error, ist_id) {
			callback(ist_id);
		}
	); 
}

Service.prototype.getUserName = function(db, ist_id, callback) {
	db.getUserName(ist_id,
		function(error, name) {
			callback(name);
		}
	); 
}

Service.prototype.getAttendanceRandomID = function(db, ist_id, code_type, code_length, total_time_s, consecutive_codes, courseID, is_extra, title, number, callback) {
	var randomID;
	do {
		randomID = Math.floor(Math.random() * Math.floor(999999));
	} while(codeByRandomID.has(randomID));
	codeByRandomID.set(randomID, null);

	db.generateRandomAttendanceCode(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, courseID, is_extra, title, number,
		function(error, attendanceID) {
			var new_code = new Code(db, randomID, attendanceID);
			new_code.customizeTest(code_length, code_type, total_time_s, consecutive_codes);
			codeByRandomID.set(randomID, new_code);
			callback(error, randomID, attendanceID);
		}
	); 
}

Service.prototype.closeAttendance = function(db, randomID, callback) {
	db.closeAttendance(randomID,
		function(error, success) {
			codeByRandomID.set(randomID, null);
			callback(error, success);
		}
	); 
}


Service.prototype.removeIAmHereToken = function(db, ist_id, callback) {
	db.removeIAmHereToken(ist_id,
		function(error, success) {
			callback(error, success);
		}
	); 
}

Service.prototype.getAttendances = function(db, callback) {
	db.getAttendances(function(error, rows) {
			let result = appendToFile(rows);
			callback(error, result);
		}
	);
}

Service.prototype.getStudentAttendanceHistory = function(db, ist_id, callback) {
	db.getStudentAttendanceHistory(ist_id,
		function(error, rows) {
			callback(error, rows);
		}
	); 
}

Service.prototype.getPCM1819AttendanceFlow = function(db, callback) {
	db.getPCM1819AttendanceFlow(
		function(error, rows) {
			callback(error, rows);
		}
	); 
}

Service.prototype.getAttendanceFlow = function(db, courseID, callback) {
	db.getAttendanceFlow(courseID,
		function(error, rows) {
			callback(error, rows);
		}
	); 
}

Service.prototype.getInactiveCourses = function(db, ist_id, callback) {
	db.getInactiveCourses(ist_id,
		function(error, rows) {
			callback(error, rows);
		}
	); 
}

Service.prototype.getAttendancesByCourseAndProfessor = function(db, courseID, ist_id, callback) {
	db.getAttendancesByCourseAndProfessor(courseID, ist_id, function(error, rows) {
			let result = appendToFile_general(rows);
			callback(error, result);
		}
	);
}

Service.prototype.getAttendancesByCourseProfessorClass = function(db, courseID, ist_id, attendanceID, callback) {
	db.getAttendancesByCourseProfessorClass(courseID, ist_id, attendanceID, function(error, rows) {
			let result = appendToFile_general(rows);
			callback(error, result);
		}
	);
}

Service.prototype.setLate = function(db, attendanceID, ist_id, isLate, callback) {
	db.setLate(attendanceID, ist_id, isLate,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.setCourseToInUse = function(db, ist_id, courseID, callback) {
	db.setCourseToInUse(ist_id, courseID,
		function(error) {
			callback(error);
		}
	); 
}



Service.prototype.insertProfessorandCourse = function(db, ist_id, courseID, courseName, academicTerm, callback) {
	db.insertProfessorandCourse(ist_id, courseID, courseName, academicTerm,
		function(error, result) {
			if(error) {
				console.log("Error in insertProfessorandCourse:", error);
			} else {
				db.setCourseToInUse(ist_id, courseID,
					function(error1, result1) {
						callback(error1);
					}
				);
			}
		}
	); 
}

function appendToFile_general(rows) {
	let ontime = "attended lecture";
	let res = "";
	if(rows == undefined) {
		return res;
	}
	for(i = 0; i < rows.length; i ++) {
		let line = rows[i].ist_id + CSV_SEPARATOR +
					rows[i].std_number + CSV_SEPARATOR +
					rows[i].name + CSV_SEPARATOR +
					ontime;
		if(rows[i].late == 1) {
			line += " (late)";
		}
		if(rows[i].manually == 1) {
			line += CSV_SEPARATOR + "M" + CSV_SEPARATOR;
		} else {
			line += CSV_SEPARATOR + CSV_SEPARATOR;
		}
		
		line += rows[i].number + "\n";
		res += line;
	}
	return res;

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
		stream.write("prof" + CSV_SEPARATOR +
			"student_nr" + CSV_SEPARATOR +
			"student_name" + CSV_SEPARATOR +
			"attended" + CSV_SEPARATOR +
			"type" + CSV_SEPARATOR +
			"class" + "\n"
		);
	}
	return stream;
}

// prof student_nr student_name attended type class
function appendToFile(rows) {
	let ontime = "attended lecture";
	let res = "";
	if(rows == undefined) {
		return res;
	}

	for(i = 0; i < rows.length; i ++) {
		let line = rows[i].ist_id + CSV_SEPARATOR +
					rows[i].std_number + CSV_SEPARATOR +
					rows[i].name + CSV_SEPARATOR +
					ontime;
		if(rows[i].late == 1) {
			line += " (late)";
		}
		if(rows[i].manually == 1) {
			line += CSV_SEPARATOR + "M" + CSV_SEPARATOR;
		} else {
			line += CSV_SEPARATOR + CSV_SEPARATOR;
		}

		if(rows[i].is_extra == 1) {
			line += rows[i].title + "\n";
		} else {
			line += rows[i].number + "\n";
		}
		res += line;
	}
	return res;

}

Service.prototype.getNextClassNumber = function(db, courseID, ist_id, callback) {
	db.getNextClassNumber(courseID, ist_id, function(error, rows) {
			callback(error, rows);
		}
	);
}

Service.prototype.updateFingerprintData = function(db, randomID, j, callback) {
	var array = ["language", "colorDepth", "deviceMemory", "hardwareConcurrency", "screenResolution", "availableScreenResolution", "timezoneOffset", "sessionStorage", "localStorage", "platform", "plugins", "canvas", "webgl","adBlock", "fonts", "audio"];
	var result = {};
	if(j && j.my_data) {
		let j_data = j.my_data;
		for(let i of array) {
			switch(typeof j_data[i]) {
				case "string":
				case "number":
					result[i] = j_data[i];
					break;
				//case "object": //implicit
				default:
					result[i] = JSON.stringify(j_data[i]);
					break;
			}
		}
		db.updateFingerprintData(randomID, result.language, result.colorDepth, result.deviceMemory, result.hardwareConcurrency, result.screenResolution, result.availableScreenResolution, result.timezoneOffset, result.sessionStorage, result.localStorage, result.platform, result.plugins, result.adBlock, result.fonts, result.audio,
			function(error, rows) {
				callback(error, rows);
		}
	);

	}
}


Service.prototype.getAttendanceInformation = function(db, attendanceID, callback) {
	db.getAttendanceInformation(attendanceID,function(error, rows) {
			callback(error, rows);
		}
	);
}

Service.prototype.updateClassInformation = function(db, attendanceID, j, callback) {
	db.updateClassInformation(attendanceID, j, function(error, rows) {
			callback(error, rows);
		}
	);
}

Service.prototype.getStudentsHistoryByClass = function(db, ist_id, courseID, callback) {
	db.getStudentsHistoryByClass(ist_id, courseID,
		function(error, rows) {
			callback(error, rows);
		}
	); 
}


module.exports = Service;
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
	var canAccess = code.canStudentAccess(ist_id);
	var that = this;
	this.studentAttendanceChecked(db, ist_id, randomID,
		function(error, isChecked) {
			if(isChecked) {
				callback(null, true, true);
			} else {
				that.insertFingerprintData(db, ist_id, useragent, ip, attendanceID,
					function(error){
						callback(error, code != undefined, false, canAccess);
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
		if(!code.canStudentAccess(ist_id)) {
			callback("You are not enrolled");
			return;
		}
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

Service.prototype.getShiftsByCourseID = function(db, courseID, callback) {
	db.getShiftsByCourseID(courseID,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				callback(error, rows);	
			}
		}
	); 
}

Service.prototype.getShiftsInfo = function(db, shiftid, callback) {
	db.getShiftsInfo(shiftid,
		function(error, rows) {
			if(error) {
				callback(error);
			} else {
				callback(error, rows);	
			}
		}
	); 
}


Service.prototype.createandinsertstudents = function(db, courseID, ist_id, is_extra, title, number, text, shift, callback) {
	db.generateRandomAttendanceCode(ist_id, 0, null, null, null, null, courseID, is_extra, title, number, shift,
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



Service.prototype.updateStudentNameAndNumber = function(db, text, courseID, callback) {
	let split_text = text.split('\n');
	let line = 0;
	aux_updateStudentNameAndNumber(db, line, split_text, courseID, callback);
}

function aux_updateStudentNameAndNumber(db, line, split_text, courseID, callback) {
	if(line < split_text.length) {
		let split_line = split_text[line].split(',');
		db.updateStudentNameAndNumber(split_line[2], split_line[1], split_line[0], courseID,
			function(error) {
				line++;
				if(line < split_text.length) {
					aux_updateStudentNameAndNumber(db, line, split_text, courseID, callback);
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
					aux_deserializedAttendancesFromLastDay(db, 0, rows, rows1, attendances,
						function() {
							callback(error, attendances);
						}
					);
				}
			);
		}
	); 
}

function aux_deserializedAttendancesFromLastDay (db, i, rows, rows1, attendances, callback) {
	if(i >= rows.length) {
		callback();
		return;
	}
	let at = rows[i];
	db.getStudentsByCourseID(at.courseID,
		function(error2, studentsEnrolled) {
			let list = [];
			for(let q = 0; q < studentsEnrolled.length; q++) {
				list.push(studentsEnrolled[q].ist_id);
			}

			if(error2) {
				callback(error2);
			} else if((at.code_length && at.code_type && at.total_time_s && at.consecutive_codes)) {
				attendances.push(at.attendanceID);
				var code = new Code(db, at.randomID, at.attendanceID);
				for(let k of rows1) {
					if(k.attendanceID == at.attendanceID) {
						code.code_counter = k.sequence;
						break;
					}
				}

				code.customizeTest(at.code_length, at.code_type, at.total_time_s, at.consecutive_codes, at.requiresAccess, list);
				codeByRandomID.set(at.randomID, code);

				if(at.open == 1) {
					code.startProcess();
				}
			}
			aux_deserializedAttendancesFromLastDay(db, i+1, rows, rows1, attendances, callback);
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

Service.prototype.removeProfessorFromCourse = function(db, ist_id, courseID, callback) {
	db.removeProfessorFromCourse(ist_id, courseID,
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
						code.customizeTest(rows[0].code_length, rows[0].code_type, rows[0].total_time_s, rows[0].consecutive_codes, rows[0].requiresAccess);
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
												db.insertProfessorandCourse(info.username, info_teaching[k]["acronym"], info_teaching[k]["name"], info_teaching[k]["academicTerm"], info_teaching[k]["id"],
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

Service.prototype.getFenixIDByCourseID = function(db, courseID, callback) {
	db.getFenixIDByCourseID(courseID,
		function(error, fenix_id) {
			if(error) {
				callback(error);
			} else {
				callback(error, fenix_id);
			}
		}
	);
}

function checkCourseShiftInfo(info, moreFields = []){
	let fields = moreFields.concat(["campus", "code_length", "code_type", "consecutivecodes", "week_day", "end", "professor_id", "room", "shift_id", "start", "time", "type"]);
	for(f of fields){
		if ((!info[f]) || info[f] == ""){
			console.log("Invalid field:", f, info[f]);
			return false;
		}
	}
	return true;
}

function checkCourseShiftInfoToUpdate(info){
	return checkCourseShiftInfo(info, ["shift_uid"]);
}

function aux_updateShifts(db, i, courseID, toUpdate, updateResults, callback){
	// shift_id, type, week_day, start, end, campus, room, courseID, prof_id, codetype, codelength, consecutive, time, shift_uid
	if(i >= toUpdate.length){
		callback();
		return;
	}

	let row = toUpdate[i];
	db.updateCourseShiftInfo(row.shift_id, row.type, row.week_day, row.start, row.end, row.campus, row.room, courseID,
		row.professor_id, row.code_type, row.code_length, row.consecutivecodes, row.time, row.shift_uid,
		function(error) {
			updateResults[i] = error ? "error" : "ok";
			return aux_updateShifts(db, i+1, courseID, toUpdate, updateResults, callback);
		}
	);
}

Service.prototype.insertShift = function(db, courseID, toUpdate, toInsert, callback) {
	/*	Fields:
		toUpdate: campus, code_length, code_type, consecutivecodes, week_day, end, professor_id, room, shift_id, shift_uid, start, time, type
		toInsert: same, except shift_uid
	*/
	let result = {};
	result.insertResult = "none";
	result.updateResults = new Array(toUpdate.length || 0);

	// process all elementos of toUpdate; then take care of toInsert
	aux_updateShifts(db, 0, courseID, toUpdate, result.updateResults, function(){
		if(checkCourseShiftInfo(toInsert)){
			db.addCourseShiftInfo(null, toInsert.shift_id, toInsert.type, toInsert.week_day, toInsert.start, toInsert.end, toInsert.campus, toInsert.room, courseID, toInsert.professor_id, toInsert.code_type, toInsert.code_length, toInsert.consecutivecodes, toInsert.time,
				function(error) {
					result.insertResult = error ? "error" : "ok";
					result.update_AnyError = result.updateResults.reduce((res, el) =>{ res = res || el=="error" });
					callback(error || result.update_AnyError, result);
				}
			);
		}else{
			result.insertResult = "invalid_field";
			callback(true, result);
		}
	});
}


Service.prototype.insertCourseShiftInfo = function(db, courseID, callback) {
	db.getFenixIDByCourseID(courseID,
		function(error, fenix_id) {
			if(error) {
				callback(error);
			} else {
				fenix_api.requestCourseShift(fenix_id,
					function(error, body) {
						let shifts = body["shifts"];
						auxShifts_insertCourseShiftInfo(db, shifts, 0, courseID, fenix_id, callback);
					});
			}
		}
	);
}

function auxShifts_insertCourseShiftInfo(db, shifts, si, courseID, fenix_id, callback) {
	if(si < shifts.length) {
		let s = shifts[si];
		let shift_id = s["name"];
		let type = s["types"][0];
		auxLessons_insertCourseShiftInfo(db, s["lessons"], 0, courseID, fenix_id, shift_id, type,
			function(error) {
				if(error) {
					console.log("Error in auxShifts_insertCourseShiftInfo");
					callback(error);
				} else {
					auxShifts_insertCourseShiftInfo(db, shifts, si+1, courseID, fenix_id, callback);
				}
			}
		);
	} else {
		callback(undefined);
	}
}

function auxLessons_insertCourseShiftInfo(db, lessons, li, courseID, fenix_id, shift_id, type, callback) {
	if(li < lessons.length) {
		let l = lessons[li];
		let start = new Date(l["start"]);
		let end = l["end"].split(" ")[1];
		let week_day = start.getDay();
		start = l["start"].split(" ")[1];
		let room = l["room"]["name"];
		let campus = l["room"]["topLevelSpace"]["name"];

		db.insertCourseShiftInfo(fenix_id, shift_id, type, week_day, start, end, campus, room, courseID,
			function(error) {
				if(error) {
					console.log("Error in insertCourseShiftInfo (Service).");
					callback(error);
				} else {
					auxLessons_insertCourseShiftInfo(db, lessons, li+1, courseID, fenix_id, shift_id, type, callback);
				}
			}
		);	
	} else {
		callback(undefined);
	}

}

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

Service.prototype.getAttendanceHistory = function(db, ist_id, courseID, shift, callback) {
	db.getAttendanceHistory(ist_id, courseID, shift, function(err, res) {
		if(err) {
			callback(err);
		} else {
			db.getCourseName(courseID, function(err1, res1) {
				if(err1) {
					callback(err1);
				} else {
					var json = {history: res,
								courseName: res1.courseName,
								secret: res1.secret};

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
						function(error) {
							//todo
						}
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

Service.prototype.getAttendanceRandomID = function(db, ist_id, code_type, code_length, total_time_s, consecutive_codes, courseID, is_extra, title, number, shift, requiresAccess, studentsEnrolled, callback) {
	var randomID;
	do {
		randomID = Math.floor(Math.random() * Math.floor(999999));
	} while(codeByRandomID.has(randomID));
	codeByRandomID.set(randomID, null);

	db.generateRandomAttendanceCode(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, courseID, is_extra, title, number, shift, requiresAccess,
		function(error, attendanceID) {
			var new_code = new Code(db, randomID, attendanceID);
			new_code.customizeTest(code_length, code_type, total_time_s, consecutive_codes, requiresAccess, studentsEnrolled);
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

Service.prototype.getAttendancesByCourseSecret = function(db, secret, callback) {
	db.getAttendancesByCourseSecret(secret, function(error, rows) {
			let result = appendToFile_general(rows);
			callback(error, result);
		}
	);
}

Service.prototype.getAttendancesByShiftSecret = function(db, secret, callback) {
	db.getAttendancesByShiftSecret(secret, function(error, rows) {
			let result = appendToFile_general(rows);
			callback(error, result);
		}
	);
}

Service.prototype.getAttendancesByClassSecret = function(db, secret, callback) {
	db.getAttendancesByClassSecret(secret, function(error, rows) {
			let result = appendToFile_general(rows);
			callback(error, result);
		}
	);
}

Service.prototype.getAttendancesByCourseProfessorClass = function(db, courseID, ist_id, attendanceID, shift, callback) {
	db.getAttendancesByCourseProfessorClass(courseID, ist_id, attendanceID, shift, function(error, rows) {
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

Service.prototype.insertManuallyProfessor = function(db, ist_id, name, courseID, callback) {
	db.insertManuallyProfessor(ist_id, name, courseID,
		function(error) {
			callback(error);
		}
	); 
}

Service.prototype.insertProfessorandCourse = function(db, ist_id, courseID, courseName, academicTerm, fenix_id, callback) {
	db.insertProfessorandCourse(ist_id, courseID, courseName, academicTerm, fenix_id,
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
					(rows[i].fenix_number || "-") + CSV_SEPARATOR +
					rows[i].std_number + CSV_SEPARATOR +
					(rows[i].short_name ? rows[i].short_name : rows[i].name) + CSV_SEPARATOR +
					ontime;
		if(rows[i].late == 1) {
			line += " (late)";
		}
		if(rows[i].manually == 1) {
			line += CSV_SEPARATOR + "M" + CSV_SEPARATOR;
		} else {
			line += CSV_SEPARATOR + CSV_SEPARATOR;
		}
		if(typeof rows[i].number == "number") {
			line += rows[i].number + CSV_SEPARATOR;;
		} else {
			line += "-" + CSV_SEPARATOR;;
		}

		line += rows[i].shift_id + "\n";
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

Service.prototype.getStudentsEnrolled = function(db, fenix_id, courseID, callback) {
	fenix_api.requestStudentsEnrolled(fenix_id,
		function(error, info) {
			var info_students = info["students"];
			if(!info_students || !info_students.length || info_students.length == 0) {
				callback(error);
			} else {
				let result_studentsenrolled = [];
				let studentsEnrolled = [];
				for(let k = 0; k < info_students.length; k++) {
					let enrolled_username = info_students[k]["username"];
					result_studentsenrolled.push([enrolled_username, courseID]);
					studentsEnrolled.push(enrolled_username);
				}
				db.insertStudentsEnrolled(result_studentsenrolled,
					function(error) {
						if(error) {
							callback(error);
						} else {
							callback(error, studentsEnrolled);
						}
					}
				);
			}
		}
	);
}


module.exports = Service;
use ist182083;

DROP FUNCTION IF EXISTS CheckAttendance;
drop PROCEDURE if exists AttendanceMapping;
drop table if exists Evaluation;
drop table if exists Code;
drop table if exists Fingerprint;
drop table if exists CodeAttendance;
drop table if exists Attendance;
drop table if exists Schedule;
drop table if exists Class;
drop table if exists Course;
drop table if exists Professor;
drop table if exists User;

CREATE TABLE User (
	ist_id						varchar(255),
	access_token 				varchar(255),
	refresh_token 				varchar(255),
	iamhere_token				varchar(255),
	name						varchar(255),
	role						varchar(255),
	creation					timestamp,

	PRIMARY KEY(ist_id)
);

CREATE TABLE Professor (
	ist_id						varchar(255),
	
	FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE Course (
	courseID					varchar(255),
	courseName					varchar(255),

	PRIMARY KEY(courseID)
);

CREATE TABLE ProfessorTeachesCourse (
	ist_id 						varchar(255),
	courseID					varchar(255),

	FOREIGN KEY(ist_id) REFERENCES Professor,
	FOREIGN KEY(courseID) REFERENCES Course
);

CREATE TABLE Class (
	courseID						varchar(255),
	classID							varchar(255),
	nr_student_enrolled				int,
	schedule						varchar(255),

	PRIMARY KEY(classID),
	FOREIGN KEY(courseID) REFERENCES Course(courseID)
);

CREATE TABLE Schedule (
	scheduleID						varchar(255),
	classID							varchar(255),
	nr_attendance					int,
	date_time						timestamp,

	PRIMARY KEY(scheduleID),
	FOREIGN KEY(classID) REFERENCES Class(classID)
);

CREATE TABLE Attendance (
	attendanceID					int AUTO_INCREMENT,
	randomID						int,
	scheduleID						varchar(255),
	code_type						varchar(255),
	code_length						int,
	total_time_s					int,
	consecutive_codes				int,
	open							boolean,

	PRIMARY KEY(attendanceID),
	FOREIGN KEY(scheduleID) REFERENCES Schedule(scheduleID)
);

CREATE TABLE CodeAttendance (
	server_code						VARCHAR(255),
	attendanceID					int,
	sequence						int,

	PRIMARY KEY(attendanceID, sequence),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
);

CREATE TABLE Fingerprint (
	fingerprintID				int AUTO_INCREMENT,
	attendanceID 				int,
	ist_id						varchar(255),

	PRIMARY KEY(fingerprintID),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE Code (
	codeID					int AUTO_INCREMENT,
	date_input				timestamp,
	ist_id 					varchar(255),
	attendanceID 			int,
	correct 				boolean,
	sequence				int,
	code_input 				varchar(255),
	time_taken_s 			int,

	PRIMARY KEY(codeID),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id),
	FOREIGN KEY(attendanceID, sequence) REFERENCES CodeAttendance(attendanceID, sequence)
);

CREATE TABLE AttendanceHistory (
	attendancehistoryID			int auto_INCREMENT,
    randomID					int,
    ist_id						varchar(255),
	success						boolean,
    
    PRIMARY KEY(attendancehistoryID),
    FOREIGN KEY(ist_id) REFERENCES User(ist_id),
    FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE Evaluation (
	evaluation_id			int AUTO_INCREMENT,
	ist_id 					varchar(255),
	attendanceID 			int,
	nr_clicks				int,
	session_time_s			int,

	PRIMARY KEY(evaluation_id),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
);

DELIMITER //
CREATE PROCEDURE AttendanceMapping (randomID int, code_type varchar(255), code_length int, total_time_s int, consecutive_codes int, open boolean)
BEGIN
INSERT INTO Attendance(randomID, code_type, code_length, total_time_s, consecutive_codes, open)
		VALUES(randomID, code_type, code_length, total_time_s, consecutive_codes, open);
SELECT LAST_INSERT_ID() AS attendanceID;
END
//
DELIMITER ;


DELIMITER //
CREATE FUNCTION CheckAttendance(attendanceID int, ist_id varchar(255), consecutive_codes int)
RETURNS boolean
BEGIN
DECLARE row_sequence INTEGER;
DECLARE row_correct boolean;
DECLARE count INTEGER DEFAULT 0;
DECLARE finished INTEGER DEFAULT 0;
DECLARE consecutiveTrue CURSOR for
	SELECT sequence, correct
	FROM Code
		WHERE attendanceID = attendanceID AND ist_id = ist_id
	ORDER BY sequence;

DECLARE CONTINUE HANDLER
FOR NOT FOUND SET finished = 1;

OPEN consecutiveTrue;
myLoop: LOOP
	FETCH consecutiveTrue INTO row_sequence, row_correct;
    IF finished = 1 THEN
		LEAVE myLoop; 
	END IF;
    IF row_correct = 1 THEN
		SET count = count + 1;
        IF count = consecutive_codes THEN
			CLOSE consecutiveTrue;
			RETURN true;
        END IF;
	ELSE
		SET count = 0;
	END IF;
END LOOP myLoop;
CLOSE consecutiveTrue;
RETURN false;
END
//
DELIMITER ;
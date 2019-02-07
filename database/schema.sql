use ist182083;

drop PROCEDURE if exists GetFingerprintInfo;
drop PROCEDURE if exists InsertProfessorandCourse;
DROP FUNCTION IF EXISTS CheckAttendance;
drop PROCEDURE if exists AttendanceMapping;
drop table if exists Evaluation;
drop table if exists AttendanceHistory;
drop table if exists Code;
drop table if exists FingerprintData;
drop table if exists CodeAttendance;
drop table if exists Attendance;
drop table if exists Class;
drop table if exists ProfessorTeachesCourse;
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
	
    PRIMARY KEY(ist_id),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE Course (
	courseID					varchar(255),
	courseName					varchar(255),
	academicTerm				varchar(255),

	PRIMARY KEY(courseID)
);

CREATE TABLE ProfessorTeachesCourse (
	ist_id 						varchar(255),
	courseID					varchar(255),

	PRIMARY KEY(ist_id, courseID),
	FOREIGN KEY(ist_id) REFERENCES Professor (ist_id),
	FOREIGN KEY(courseID) REFERENCES Course (courseID)
);

CREATE TABLE Class (
	ist_id							varchar(255),
	courseID						varchar(255),
	classID							varchar(255),

	PRIMARY KEY(classID),
	FOREIGN KEY(ist_id) REFERENCES Professor (ist_id),
	FOREIGN KEY(courseID) REFERENCES Course(courseID)
);

CREATE TABLE Attendance (
	ist_id								varchar(255),
	attendanceID					int AUTO_INCREMENT,
	randomID						int,
	code_type						varchar(255),
	code_length						int,
	total_time_s					int,
	consecutive_codes				int,
    date								varchar(255),
	open							boolean,

	PRIMARY KEY(attendanceID),
    FOREIGN KEY(ist_id) REFERENCES Professor(ist_id)
);

CREATE TABLE CodeAttendance (
	server_code						VARCHAR(255),
	attendanceID					int,
	sequence						int,

	PRIMARY KEY(attendanceID, sequence),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
);

CREATE TABLE FingerprintData (
	fingerprintID				int AUTO_INCREMENT,
	timestamp				timestamp,
	ist_id						varchar(255),
    useragent				varchar(255),
    ip		varchar(255),
    

	PRIMARY KEY(fingerprintID),
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
    attendanceID					int,
    ist_id						varchar(255),
	success						boolean,
    
    PRIMARY KEY(attendancehistoryID),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID),
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
CREATE PROCEDURE AttendanceMapping (ist_id varchar(255), randomID int, code_type varchar(255), code_length int, total_time_s int, consecutive_codes int, date varchar(255), open boolean)
BEGIN
INSERT INTO Attendance(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, date, open)
		VALUES(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, date, open);
SELECT LAST_INSERT_ID() AS attendanceID;
END
//
DELIMITER ;

DELIMITER //
CREATE FUNCTION CheckAttendance(my_attendanceID int, my_ist_id varchar(255), my_consecutive_codes int)
RETURNS boolean
BEGIN
DECLARE row_sequence INTEGER;
DECLARE row_correct boolean;
DECLARE count INTEGER DEFAULT 0;
DECLARE finished INTEGER DEFAULT 0;
DECLARE consecutiveTrue CURSOR for
	SELECT sequence, correct
	FROM Code
		WHERE attendanceID = my_attendanceID AND ist_id = my_ist_id
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
        IF count = my_consecutive_codes THEN
			CLOSE consecutiveTrue;
            INSERT IGNORE INTO AttendanceHistory(attendanceID, ist_id, success) VALUES (my_attendanceID, my_ist_id, true);
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

DELIMITER //
CREATE PROCEDURE InsertProfessorandCourse(ist_id varchar(255), courseID varchar(255), courseName varchar(255), academicTerm varchar(255))
BEGIN
	INSERT IGNORE INTO Professor (ist_id)
		VALUES (ist_id);
		
	INSERT IGNORE INTO Course (courseID, courseName, academicTerm)
		VALUES(courseID, courseName, academicTerm);

	INSERT IGNORE INTO ProfessorTeachesCourse (ist_id, courseID)
		VALUES(ist_id, courseID);
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE GetFingerprintInfo(my_ist_id varchar(255), my_attendanceID int)
BEGIN
	SELECT f.useragent, f.ip
		FROM FingerprintData f, Attendance a, AttendanceHistory ah
        WHERE
			a.attendanceID = my_attendanceID AND
			ah.attendanceID = my_attendanceID AND
            ah.attendanceID = a.attendanceID AND
            f.ist_id = my_ist_id AND
            ah.ist_id = my_ist_id;
END
//
DELIMITER ;

INSERT INTO User(ist_id) VALUES ('ist182083');
INSERT INTO Professor(ist_id) VALUES ('ist182083');


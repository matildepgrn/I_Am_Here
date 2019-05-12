use ist182083;

drop procedure if exists setLate;
drop procedure if exists GetAttendances;
drop procedure if exists ShowAttendances;
drop procedure if exists RemoveAttendanceFromProfessor;
drop PROCEDURE if exists InsertFingerprint;
drop PROCEDURE if exists CheckFingerprint;
drop procedure if exists InsertLateStudentToAttendance;
drop PROCEDURE if exists InsertStudentToAttendance;
drop PROCEDURE if exists GetFingerprintInfo;
drop PROCEDURE if exists InsertProfessorandCourse;
DROP FUNCTION IF EXISTS CheckAttendance;
drop PROCEDURE if exists AttendanceMapping;
drop PROCEDURE if exists RemoveStudentFromAttendance;
drop table if exists AttendancesRemoved;
drop table if exists StudentsManuallyRemoved;
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
	in_use						boolean,

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
    courseID							varchar(255),
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
    attendanceID			int,	
	ist_id						varchar(255),
    useragent				varchar(255),
    ip		varchar(255),
    

	PRIMARY KEY(fingerprintID),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id),
    FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
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
    manually						boolean,
    late 						boolean,
    
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

create table StudentsManuallyRemoved (
	removedID				int AUTO_INCREMENT,
	ist_id						varchar(255),
	attendanceID			int,
    
	PRIMARY KEY(removedID),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
);

CREATE TABLE PCM1819 (
	pcm1819_id					int AUTO_INCREMENT,
	ist_id						varchar(255),
	std_number					int,
	name 						varchar(255),

	PRIMARY KEY(pcm1819_id),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE AttendancesRemoved (
	ist_id								varchar(255),
	attendanceID					int AUTO_INCREMENT,

 	PRIMARY KEY(attendanceID),
    FOREIGN KEY(ist_id) REFERENCES Professor(ist_id)
);

DELIMITER //
CREATE PROCEDURE RemoveStudentFromAttendance (my_ist_id varchar(255), my_attendanceID int)
BEGIN
INSERT INTO StudentsManuallyRemoved(ist_id, attendanceID)
		VALUES(my_ist_id, my_attendanceID);
        
DELETE FROM AttendanceHistory WHERE attendanceID =  my_attendanceID and ist_id = my_ist_id;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE AttendanceMapping (ist_id varchar(255), randomID int, code_type varchar(255), code_length int, total_time_s int, consecutive_codes int, date varchar(255), open boolean, my_courseID varchar(255), my_is_extra varchar(255), my_title varchar(255), my_number int)
BEGIN

INSERT INTO Attendance(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, date, open, number, courseID, is_extra, title)
		VALUES(ist_id, randomID, code_type, code_length, total_time_s, consecutive_codes, date, open, my_number, my_courseID, my_is_extra, my_title);

SELECT LAST_INSERT_ID() AS attendanceID;
END
//
DELIMITER ;

DELIMITER //
CREATE FUNCTION CheckAttendance(my_attendanceID int, my_ist_id varchar(255), my_consecutive_codes int)
RETURNS boolean
BEGIN
DECLARE row_sequence INTEGER;
DECLARE prev_row_sequence INTEGER;
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
		IF count > 1 THEN
			IF row_sequence = prev_row_sequence + 1 THEN
				/*ok*/
				IF count = my_consecutive_codes THEN
					CLOSE consecutiveTrue;
					SELECT ist_id INTO @old_ist_id FROM AttendanceHistory WHERE attendanceID = my_attendanceID AND ist_id = my_ist_id LIMIT 1;
						IF(@old_ist_id IS NULL) THEN
		            		INSERT IGNORE INTO AttendanceHistory(attendanceID, ist_id, success, manually) VALUES (my_attendanceID, my_ist_id, true, false);
		            	END IF;
					RETURN true;
		        END IF;
			ELSE
				SET count = 1;
			END IF;
		END IF;
	ELSE
		SET count = 0;
	END IF;
	SET prev_row_sequence = row_sequence;
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
SELECT distinct f.ip, f.useragent
	FROM FingerprintData f
		WHERE f.ist_id = my_ist_id AND
				f.attendanceID = my_attendanceID;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE InsertStudentToAttendance(my_ist_id varchar(255), my_attendanceID int)
BEGIN
	DECLARE existsInTable INTEGER;
        
	INSERT IGNORE INTO User (ist_id)
		VALUES (my_ist_id);
		
	SELECT ist_id INTO existsInTable FROM AttendanceHistory WHERE ist_id = my_ist_id AND attendanceID = my_attendanceID LIMIT 1;
    IF existsInTable IS NULL THEN
		INSERT IGNORE INTO AttendanceHistory (attendanceID, ist_id, success, manually)
			VALUES(my_attendanceID, my_ist_id, true, true);
	END IF;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE InsertLateStudentToAttendance(my_ist_id varchar(255), my_attendanceID int)
BEGIN
	DECLARE existsInTable INTEGER;
        
	INSERT IGNORE INTO User (ist_id)
		VALUES (my_ist_id);
		
	SELECT ist_id INTO existsInTable FROM AttendanceHistory WHERE ist_id = my_ist_id AND attendanceID = my_attendanceID LIMIT 1;
    IF existsInTable IS NULL THEN
		INSERT IGNORE INTO AttendanceHistory (attendanceID, ist_id, success, late)
			VALUES(my_attendanceID, my_ist_id, true, true);
	END IF;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE CheckFingerprint(my_attendanceID int)
BEGIN
SELECT distinct f.ist_id
		FROM FingerprintData f, Attendance a, AttendanceHistory ah
        WHERE
            f.attendanceID = my_attendanceID AND
            ah.attendanceID = f.attendanceID AND
            a.attendanceID = f.attendanceID
            group by f.ist_id, f.ip
            having count(*) > 1;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE InsertFingerprint(my_attendanceID int, my_ist_id varchar(255), my_ip varchar (255), my_usergante varchar(255))
BEGIN
DECLARE existsInTable INTEGER;
SELECT ist_id INTO existsInTable from FingerprintData where attendanceID = my_attendanceID and ist_id = my_ist_id LIMIT 1;
IF existsInTable IS NULL THEN
	INSERT INTO FingerprintData(ist_id, useragent, ip, attendanceID) VALUES(my_ist_id,my_usergante,my_ip,my_attendanceID);
END IF;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE RemoveAttendanceFromProfessor(my_attendanceID int, my_ist_id varchar(255))
BEGIN
	INSERT INTO AttendancesRemoved(attendanceID, ist_id)
		VALUES (my_attendanceID, my_ist_id);
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE ShowAttendances()
BEGIN
select a.ist_id, ah.attendanceID, pcm.std_number, pcm.name, ah.late, ah.manually, a.number, a.is_extra
	from Attendance a
		join AttendanceHistory ah
			on ah.attendanceID = a.attendanceID
		join PCM1819 pcm
			on ah.ist_id = pcm.ist_id
	where (a.ist_id = 'ist13909' or a.ist_id = 'ist13898' or a.ist_id = 'ist168202')
		and a.courseID = 'PCM26'
		and a.attendanceID > 107;
END
//
DELIMITER ;


DELIMITER //
CREATE PROCEDURE GetAttendances(my_courseID varchar(255), my_ist_id varchar(255))
BEGIN
select a.ist_id, u.ist_id as std_number, u.name, ah.late, ah.manually, a.number, a.is_extra
	from Attendance a
		join AttendanceHistory ah
			on ah.attendanceID = a.attendanceID
		join User u
			on ah.ist_id = u.ist_id
	where a.ist_id = my_ist_id
		and a.courseID = my_courseID
		order by a.attendanceID;
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE setLate(my_attendanceID int, my_ist_id varchar(255), isLate boolean)
BEGIN
	UPDATE AttendanceHistory SET late = isLate WHERE (attendanceID = my_attendanceID and ist_id = my_ist_id);
END
//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE getNextClassNumber(my_courseID varchar(255), my_ist_id varchar(255))
BEGIN
DECLARE count_nr INTEGER;

SELECT number INTO count_nr FROM Attendance a, AttendanceHistory ah 
		WHERE a.ist_id = my_ist_id and a.attendanceID = ah.attendanceID AND a.courseID = my_courseID AND a.is_extra != 1 AND a.attendanceID 
			NOT IN (SELECT ar.attendanceID FROM AttendancesRemoved ar where ar.ist_id = my_ist_id) 
			group by a.attendanceID DESC limit 1;
	IF count_nr is null THEN
		SET count_nr = 1;
	ELSE
		SET count_nr = count_nr + 1;
	END IF;
    
    SELECT count_nr;

END
//
DELIMITER ;

INSERT INTO User(ist_id) VALUES ('ist182083');
INSERT INTO Professor(ist_id) VALUES ('ist182083');


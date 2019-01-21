use ist182083;

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
	ist_id				varchar(255),
	access_token 		varchar(255),
	refresh_token 		varchar(255),
	iamhere_token		varchar(255),
	name				varchar(255),
	role				varchar(255),
	creation			timestamp,

	PRIMARY KEY(ist_id)
);

CREATE TABLE Professor (
	ist_id				varchar(255),
	
	FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE Course (
	courseID			varchar(255),
	courseName			varchar(255),
	campus				varchar(255),

	PRIMARY KEY(courseID)
);

CREATE TABLE Class (
	courseID			varchar(255),
	classID				varchar(255),
	nr_student_enrolled	int,
	schedule			varchar(255),

	PRIMARY KEY(classID),
	FOREIGN KEY(courseID) REFERENCES Course(courseID)
);

CREATE TABLE Schedule (
	scheduleID			varchar(255),
	classID				varchar(255),
	nr_attendance		int,
	date_time			timestamp,

	PRIMARY KEY(scheduleID),
	FOREIGN KEY(classID) REFERENCES Class(classID)
);

CREATE TABLE Attendance (
	attendanceID		int AUTO_INCREMENT,
	randomID			int,
	scheduleID			varchar(255),
	code_type			varchar(255),
	code_length			int,
	total_time_s		int,
	consecutive_codes	int,
	open				boolean,

	PRIMARY KEY(attendanceID),
	FOREIGN KEY(scheduleID) REFERENCES Schedule(scheduleID)
);

CREATE TABLE CodeAttendance (
	server_code			VARCHAR(255),
	attendanceID		int,
	sequence			int,

	PRIMARY KEY(attendanceID, sequence),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
);

CREATE TABLE Fingerprint (
	fingerprintID		int AUTO_INCREMENT,
	attendanceID 		int,
	ist_id				varchar(255),

	PRIMARY KEY(fingerprintID),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id)
);

CREATE TABLE Code (
	codeID				int AUTO_INCREMENT,
	date_input			timestamp,
	ist_id 				varchar(255),
	attendanceID 		int,
	correct 			boolean,
	sequence			int,
	code_input 			varchar(255),
	time_taken_s 		int,

	PRIMARY KEY(codeID),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id),
	FOREIGN KEY(attendanceID, sequence) REFERENCES CodeAttendance(attendanceID, sequence)
);

CREATE TABLE Evaluation (
	evaluation_id		int AUTO_INCREMENT,
	ist_id 				varchar(255),
	attendanceID 		int,
	nr_clicks			int,
	session_time_s		int,

	PRIMARY KEY(evaluation_id),
	FOREIGN KEY(ist_id) REFERENCES User(ist_id),
	FOREIGN KEY(attendanceID) REFERENCES Attendance(attendanceID)
);
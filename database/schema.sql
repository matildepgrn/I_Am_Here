use ist182083;

drop table if exists User;

CREATE TABLE User (
	ist_id				varchar(255) NOT NULL,
	access_token 			varchar(255),
	refresh_token 			varchar(255),
	creation			timestamp,
	PRIMARY KEY(ist_id)
);

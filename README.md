# I Am Here!
Master Project in Information and Software Engineering @ Instituto Superior Técnico

(c) 2018-2019 by [Matilde Nascimento](https://github.com/matildepgrn)

Advisor: [Daniel Gonçalves](https://github.com/domiriel)

### Setup
Install the dependencies:
```bash
$ npm install mysql
$ npm install require
```
And download the file [qrcode.min.js](https://raw.githubusercontent.com/davidshimjs/qrcodejs/master/qrcode.min.js), from [davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs), into the project's root directory.

#### Config file
Edit **config.js** according with your credentials.
Example:
```js
var config = {};

// MySQL
config.mysql_pw = 'root';
config.mysql_user = "root";
config.mysql_host = "localhost";
config.database = 'database';

// Use HTTPS (default is HTTP)
config.use_HTTPS = true;
config.tls_cert_key = 'cert.key';
config.tls_cert_crt = 'cert.crt';
config.tls_cert_ca = 'cert_ca.crt';

module.exports = config;
```
NOTE: these credentials WILL NOT work. Use your own.

There are also other variables that can be change (e.g., PORT).
More info in **default_config.js**.

### Run
```bash
$ nodejs server.js
```
Tested with Node.js v10.15.0 and v11.0.0, and MySQL Server 5.5.54-0+deb8u1-log (Debian).



Repository: https://github.com/matildepgrn/I_Am_Here

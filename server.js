
const express = require('express');
const cyberfiles = require('./main');
const logger = require('cyber-express-logger');

const config = require('./server-config.json');

const srv = express();
srv.use(logger({ getIP: req => req.headers[config.server.ip_header] }));
srv.use(cyberfiles(config.cyberfiles));
srv.listen(config.server.port, () => console.log(`Listening on port ${config.server.port}`));
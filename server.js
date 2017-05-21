'use strict';

const
  bodyParser = require('body-parser'),
  // loads ./config/default.js
  config = require('config'),
  express = require('express'),
  mongoose = require('mongoose'),
  flash = require('connect-flash'),

  morgan = require('morgan'),
  cookieParser = require('cookie-parser'),
  session = require('express-session');

const routes = require('./app/routes');
const configDB = require('./config/database.js');

mongoose.connect(configDB.url)

const app = express();
app.set('port', process.env.PORT || config.get('port'));
app.set('address', process.env.ADDRESS || config.get('address'));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());
app.use(bodyParser.json());
app.use(express.static('public'));

try {
  routes(app);
} catch (e) {
   console.error(e);
}
const server = app.listen(app.get('port'), app.get('address'), () => {
  console.log('Yay! Verbi Server is running at %s:%s', server.address().address, server.address().port);
});

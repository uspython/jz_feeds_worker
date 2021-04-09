const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLogger = require('morgan');

// optional
// const ms = require('ms');
// const dayjs = require('dayjs');
const Graceful = require('@ladjs/graceful');
// const Cabin = require('cabin');
const Bree = require('bree');

// // required
const usersRouter = require('./routes/users');
const indexRouter = require('./routes/index');
const logger = require('./worker/logger');

const app = express();
const port = 3001;

// // view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(expressLogger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  logger.info(`Example app listening at http://localhost:${port}`);
});

const bree = new Bree({
  // logger: new Cabin(),
  jobs: [
    {
      name: 'weather',
      timeout: '30m',
      interval: `${process.env.WEATHER_JOB_INTERVAL || '1h'}`,
    },
    {
      name: 'upload_s3',
      timeout: '40m',
      interval: '1h',
    },
  ],
});

// handle graceful reloads, pm2 support, and events like SIGHUP, SIGINT, etc.
const graceful = new Graceful({ brees: [bree] });
graceful.listen();

// start all jobs (this is the equivalent of reloading a crontab):
bree.start();

module.exports = app;

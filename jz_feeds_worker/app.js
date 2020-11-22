const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// optional
// const ms = require('ms');
// const dayjs = require('dayjs');
// const Graceful = require('@ladjs/graceful');
// const Cabin = require('cabin');

// // required
// const Bree = require('bree');
const usersRouter = require('./routes/users');
const indexRouter = require('./routes/index');

// const fetch = require('./worker/fetch');

const app = express();
const port = 3001;

// // view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
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
  console.log(`Example app listening at http://localhost:${port}`);
});

// fetch(
//   'GET',
//   'http://bjweather.iyuebo.com/weather.php',
//   null,
//   {
//     a: 'getChartData',
//   },
// ).then((response) => {
//   const { status, statusText, data } = response;

//   // console.log(status, statusText, data);
//   if (status === 200 || statusText === 'OK') {
//     if (data.toString().length === 0) {
//       throw new Error('Request is OK, but api is shut down now');
//     }
//   }
// }).catch((e) => {
//   console.log(e);
// });

module.exports = app;

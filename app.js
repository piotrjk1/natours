const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers

// inside use() we need function, not calling function, but helmet() returns function
app.use(helmet());

// Zezwól na połączenia z frontendem
app.use(
  cors({
    // origin: 'http://localhost:3000', // Możesz również użyć '*' jeśli chcesz zezwolić na połączenia z dowolnej domeny
    origin: '*',
    credentials: true, // Zezwala na przesyłanie ciasteczek
  }),
);

// Ustawienie polityki CSP
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: [
//         "'self'",
//         'https://cdnjs.cloudflare.com',
//         'https://js.stripe.com',
//       ], // Dodaj inne źródła jeśli potrzebujesz
//       connectSrc: [
//         "'self'",
//         'http://127.0.0.1:3000',
//         'https://js.stripe.com',
//         'https://api.stripe.com',
//       ], // Dodaj źródło API
//     },
//     frameSrc: ["'self'", 'https://js.stripe.com'], //Pozwala Stripe na osadzanie iframe
//   }),
// );
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdnjs.cloudflare.com',
        'https://js.stripe.com',
      ],
      connectSrc: [
        "'self'",
        'http://127.0.0.1:3000',
        'https://js.stripe.com',
        'https://api.stripe.com',
        'https://checkout.stripe.com',
      ],
      frameSrc: [
        "'self'",
        'https://js.stripe.com',
        'https://checkout.stripe.com',
      ], // ✅ Poprawione miejsce
    },
  }),
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //middleware
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'prize',
    ],
  }),
);

// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  // console.log(req.headers);
  next();
});

// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'Hello from the server side!', app: 'Natours' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint...');
// });

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//all HTTP methods (jeśli powyższe tours i users nie przejmie to trafi tutaj i pokaze błąd)
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  ////////////////////////////////////////////////////////////////////////////////////////////////
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // // Jeśli next otrzyma argument, nie ważne co jest tym argumentem, Express tak czy siak będzie wiedział, że to jest error
  // next(err);
  ////////////////////////////////////////////////////////////////////////////////////////////////
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

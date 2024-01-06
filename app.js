import createError from 'http-errors';
import express from 'express';
import helmet  from 'helmet';
import path from 'path';
import logger from 'morgan';
import sassMiddleware from 'node-sass-middleware';

import tiereRouter from './routes/tiere.js';

// AS specific modules
//import DB from './node_modules/as-express/lib/database.js';
//import AsExpress from './node_modules/as-express/lib/as-express.js';
import {AsExpress} from 'as-express';
import dbSchema from './dbSchema.js';
import permissions from './permissions.js';

// workaround for missing __dirname in ES6 modules
import { URL } from 'url';
const __dirname = new URL('.', import.meta.url).pathname;

const app = express();
app.use(helmet());

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", 'wss:'],
    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.jsdelivr.net'],
    imgSrc: ["'self'", 'data:', '*.tile.osm.org', 'fonts.googleapis.com', 'cdn.jsdelivr.net'],
    fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com']
  }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));

app.use(function (req, res, next) {
  // disallow all php requests
  if (req.url.endsWith('.php')) {
    res.status(403).end();
    return;
  }
  // some other request no abort
  if (!req.headers || !req.headers.host) {
    res.status(403).end();
    return;
  }

  if (req.url.endsWith('manager/html')) {
    res.status(403).end();
    return;
  }

  let proxyForwardedFor = req.headers['x-forwarded-for'];

  let realIP = req.headers['x-real-ip'];
  if (realIP) {
    console.log(`x-real-ip: ${realIP}`);
  }
  let host = req.headers['host'];
  if (host) {
    console.log(`host: ${host}`);
  }

  if (proxyForwardedFor || req.secure || process.env.NODE_ENV === 'development') {
    // request was via https or server runs in a dev environment ->no special handling
    // if (req.secure) {
    //   console.log("Request is already https - next()");
    // }
    // console.log("Running in " + process.env.NODE_ENV + " mode. Allow " + req.protocol + '://' + req.get('host') + req.url);
    next();
  } else {
    // request was via http, so redirect to https
    const secUrl = 'https://' + req.headers.host + req.url;
    console.log("Redirecting " + req.protocol + '://' + req.get('host') + req.url + " to https: " + secUrl);
    res.redirect(secUrl);
  }
});

app.use(express.static(path.join(__dirname, 'dist')));  // serve vue client app
app.use(express.static(path.join(__dirname, 'public')));

const asExpress = new AsExpress('finanzkraft', app);
asExpress.init({
  dbSchema: dbSchema,
  permissions: permissions,
})
.then(() => {
  asExpress.addRouter("/api/tiere", tiereRouter);
  // const router = express.Router();
  // const corsOptions = {
  //   origin: ['http://localhost:5173', 'https://localhost:5173'],
  //   credentials: true, // sets 'Access-Control-Allow-Credentials' to true
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // allowedHeaders: ['Content-Type', 'Authorization', 'Location'],
  //   preflightContinue: false,
  //   optionsSuccessStatus: 204,
  // };
  //
  // router.options('/', function(req, res, next) {
  //   CORS(corsOptions)(req, res, next); // enable pre-flight
  // });
  // router.get('/', function (req, res, next) {
  //   res.json({gattungen: ['Schneeleopard', 'Pantherkatze', 'Jaguar', 'Leopard', 'Löwe', 'Tiger', 'Altkatze', 'Marmorkatze', 'Goldkatze', 'Luchs', 'Schlankkatze', 'Wieselkatze']});
  // });
  // app.use("/api/tiere", router);

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });

// error handler
  app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

})
.catch((error) => {
  console.error(error);
});

export default app;
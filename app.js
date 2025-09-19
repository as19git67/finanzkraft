import express from 'express';
import helmet from 'helmet';
import path from 'path';
import logger from 'morgan';

import AsExpress from "./as-express.js";
import basePermissions from './basePermissions.js';
import permissions from './permissions.js';
import dbSchema from './dbSchema.js';
import accountRouter from './routes/account.js';
import accountsRouter from './routes/accounts.js';
import bankcontactRouter from './routes/bankcontact.js';
import bankcontactsRouter from './routes/bankcontacts.js';
import accountTypesRouter from './routes/accountTypes.js';
import transactionRouter from './routes/transaction.js';
import transactionsRouter from './routes/transactions.js';
import transactionsOfAccountRouter from './routes/transactionsOfAccount.js';
import newTransactionPresetsRouter from './routes/newTransactionPresets.js';
import categoriesRouter from './routes/categories.js';
import tagsRouter from './routes/tags.js';
import timespanRouter from './routes/timespans.js';
import currenciesRouter from './routes/currencies.js';
import ruleRouter from './routes/rule.js';
import rulesRouter from './routes/rules.js';
import dbMixinAccounts from "./dbMixinAccounts.js";
import dbMixinTransactions from "./dbMixinTransactions.js";
import dbMixinPrefsNewTransactionPresets from "./dbMixinPrefsNewTransactionPresets.js";
import DbMixinSystemPreferences from "./DbMixinSystemPreferences.js";
import dbMixinCurrencies from "./dbMixinCurrencies.js";
import dbMixinAccountTypes from "./dbMixinAccountTypes.js";
import dbMixinCategories from "./dbMixinCategories.js";
import dbMixinTags from "./dbMixinTags.js";
import dbMixinTimespan from "./dbMixinTimespan.js";
import dbMixinRules from "./dbMixinRules.js";
import dbMixinOnlineBanking from "./dbMixinOnlineBanking.js";
import di from './dataImport.js'
import dataExporter from './dataExport.js'

// workaround for missing __dirname in ES6 modules
import {URL} from 'url';

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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(express.static(path.join(__dirname, 'dist')));  // serve vue client app

const asExpress = new AsExpress('finanzkraft', app);
new Promise(async (resolve, reject) => {
  await asExpress.init({
    dbSchemas: [dbSchema],
    dbMixins: [
      dbMixinAccounts,
      dbMixinTransactions,
      dbMixinPrefsNewTransactionPresets,
      DbMixinSystemPreferences,
      dbMixinCurrencies,
      dbMixinAccountTypes,
      dbMixinCategories,
      dbMixinTags,
      dbMixinTimespan,
      dbMixinRules,
      dbMixinOnlineBanking,
    ],
    dbImporter: [di],
    dbExporter: [dataExporter],
    permissions: {...basePermissions, ...permissions} ,
  });

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

    // redirect to https if
    // * https port configured in as-express
    // * not forwarded by proxy
    // * request not already via https
    // * not in development mode
    if (!asExpress.secure || proxyForwardedFor || req.secure || process.env.NODE_ENV === 'development') {
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

  asExpress.addRouter("/api/accounts", transactionsOfAccountRouter);
  asExpress.addRouter("/api/accounts", accountsRouter);
  asExpress.addRouter("/api/accounts", accountRouter);
  asExpress.addRouter("/api/bankcontacts", bankcontactsRouter);
  asExpress.addRouter("/api/bankcontacts", bankcontactRouter);
  asExpress.addRouter("/api/accounttypes", accountTypesRouter);
  asExpress.addRouter("/api/transaction", transactionRouter);
  asExpress.addRouter("/api/transaction", transactionsRouter);
  asExpress.addRouter("/api/newtransactionpresets", newTransactionPresetsRouter);
  asExpress.addRouter("/api/currencies", currenciesRouter);
  asExpress.addRouter("/api/timespans", timespanRouter);
  asExpress.addRouter("/api/tags", tagsRouter);
  asExpress.addRouter("/api/category", categoriesRouter);
  asExpress.addRouter("/api/rules", rulesRouter);
  asExpress.addRouter("/api/rules", ruleRouter);

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

  // Always return index.html for any unknown paths (for SPA routing) if not /api/*
  // If url is a api call but not handled catch it and send 404 as response
  app.use(function (req, res, next) {
    if (req.url.startsWith('/api')) {
      res.status(404).send();
    } else {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });

  // error handler
  app.use(function (err, req, res, next) {
    console.log(err.message);
    let status = err.status;
    if (!status) {
      switch (err.cause) {
        case 'unknown':  // unknown user...
        case 'invalid':  // wrong password...
          status = 401; // unauthorized
          err.message = 'Anmeldedaten ungültig';
          break;
        case 'expired':
          status = 403;
          break;
        default:
          status = 500;
      }
    }
    // set locals, only providing error in development
    res.status(status).send(err.message);
    // res.locals.message = err.message;
    // res.locals.error = req.app.get('env') === 'development' ? err : {};
    //
    // // render the error page
    // res.status(err.status || 500);
    // res.render('error');
  });

}).then(() => {
  console.log(`${app.name} started.`)
}).catch((reason) => {
  console.error(reason);
});

export default app;

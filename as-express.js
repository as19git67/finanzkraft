import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import https from 'https';
import waitFor from 'p-wait-for';
import http from 'http';
import debug from 'debug';
import CORS from 'cors';
import passport from 'passport';
import express from 'express';
import {fileURLToPath} from 'url';
import {DateTime} from 'luxon';
import AsPassport from './as-passport.js';
import config from './config.js';
import DB from './database.js';
import UserDatabaseMixin from './userDatabaseMixin.js';
import basePermissions from './basePermissions.js';
import userRouteConfig from './routes/user.js';
import userByIdRouteConfig from './routes/userById.js';
import roleRouteConfig from './routes/role.js';
import rolesRouteConfig from './routes/roles.js';
import permissionProfilesRouteConfig from './routes/permissionProfiles.js';
import rolePermissionProfilesRouteConfig
  from './routes/rolePermissionProfiles.js';
import authRouteConfig from './routes/auth.js';
import userrolesRouteConfig from './routes/userroles.js';

class HttpError {
  constructor(errorCode, msg) {
    this.status = errorCode;
    this.message = msg;

    Error.captureStackTrace(this);
    Error.call(this, msg);
  }
}

export default class AsExpress {
  #haveHttpServer = false;

  #port;

  #secure = false; // true if https is configured

  #sockets = new Set();

  #secureSockets = new Set();

  #httpServerTerminating = false;

  #database;

  #dirname;

  #exportTimer;

  constructor(appName, app) {
    const filename = fileURLToPath(import.meta.url);
    this.#dirname = path.dirname(filename);

    this.appName = appName;
    this.app = app;
    debug(`${this.appName}:server`);
  }

  async init(options) {
    options || (options = {});
    if (options.permissions) {
      this.permissions = _.extend(options.permissions, basePermissions);
    } else {
      this.permissions = basePermissions;
    }
    let dbSchemas = [];
    if (options.dbSchemas && _.isArray(options.dbSchemas)) {
      dbSchemas = options.dbSchemas;
    }
    const dbMixins = [UserDatabaseMixin];
    if (options.dbMixins) {
      if (_.isArray(options.dbMixins)) {
        for (const dbMixin of options.dbMixins) {
          dbMixins.push(dbMixin);
        }
      } else {
        dbMixins.push(options.dbMixins);
      }
    }
    const dbImporter = [];
    const {dataDirectory, importDatafile, exportDatafile} = config;
    if (importDatafile && options.dbImporter) {
      if (_.isArray(options.dbImporter)) {
        for (const dbImportFunction of options.dbImporter) {
          dbImporter.push(dbImportFunction);
        }
      } else {
        dbImporter.push(options.dbImporter);
      }
    }
    const dbExporter = [];
    if (exportDatafile && options.dbExporter) {
      if (_.isArray(options.dbExporter)) {
        for (const dbExportFunction of options.dbExporter) {
          dbExporter.push(dbExportFunction);
        }
      } else {
        dbExporter.push(options.dbExporter);
      }
    }
    await this.#initDB(dbSchemas, dbMixins, options.dropTables);
    this.app.set('database', this.#database);
    this.app.set('permissions', this.permissions);
    if (dbImporter.length > 0) {
      await this.#importData(dbImporter,
          path.resolve(dataDirectory, importDatafile));
    }
    this.#initApiRouter();
    await this.#initPassport();
    await this.#startHttpServer();

    if (dbExporter.length > 0) {
      try {
        await this.#exportData(dbExporter,
            path.resolve(dataDirectory, exportDatafile));
        this.#exportTimer = setInterval(async () => {
          console.log('Regularly exporting DB...');
          await this.#exportData(dbExporter,
              path.resolve(dataDirectory, exportDatafile));
        }, 1000 * 3600 * 8);
      } catch (ex) {
        if (this.#exportTimer) {
          clearInterval(this.#exportTimer);
          console.log(`DB export failed: ${ex.message}`);
          debug(ex);
          await this.terminateHttpServer();
        }
      }
    }
  }

  async #initDB(dbSchemas, dbMixins, dropTables) {
    const {adminUser} = config;
    if (!adminUser) {
      console.log(
          'Not checking if initialization needed, because adminUser is not configured');
      return;
    }

    this.#database = new DB({appName: this.appName, mixins: dbMixins});
    if (dropTables) {
      await this.#database.dropAllTables(dbSchemas);
    }
    // todo: if base schema needs to be rebuild by dropping all tables, drop additional schemas before because of FK
    const wasOk = await this.#initAdditionalSchemas(dbSchemas);
    if (!wasOk) {
      await this.#initData();
    }
    await this.#setPermissionProfiles();
    await this.#setAdminRolePermissions();
  }

  async #setPermissionProfiles() {
    console.log('Filling PermissionProfiles in database');
    await this.#database.setPermissionProfiles(this.permissions);
  }

  async #setAdminRolePermissions() {
    console.log('Updating admin role with basePermissions');
    const permissionProfileKeys = Object.keys(this.permissions);
    // assume initially created admin role has always id 1
    await this.#database.setPermissionProfileAssignmentsForRole(1,
        permissionProfileKeys);
  }

  async #initAdditionalSchemas(dbSchemas) {
    let schemaOK = true;
    const {initialAdminPassword} = config;
    if (initialAdminPassword) {

      for (const schema of dbSchemas) {
        console.log(`Checking if DB schema ${schema.name} is up to date...`);
        const ok = await this.#database.isSchemaOK(schema);
        if (!ok) {
          schemaOK = false;
          break;
        }
      }

      if (schemaOK) {
        console.log('Database schema is ok. Not performing initial config.');
      } else {

        // create or upgrade additional DB schemas
        for (const schema of dbSchemas) {
          try {
            await this.#database.makeSchemaUpToDate(schema);
          } catch (ex) {
            console.log(
                `ERROR: Creating or upgrading database schema ${schema.name} to V${schema.version} failed: ${ex.message}`,
            );
            throw ex;
          }
        }
      }
    } else {
      const errMsg = 'ERROR: Not creating or upgrading database schema, because initialAdminPassword is not configured';
      console.log(errMsg);
      throw new Error(errMsg);
    }
    return schemaOK;
  }

  async #initData() {
    const result = await this.#database.getUser();
    if (result.length === 0) {
      console.log('Creating initial admin user...');
      const {adminUser, initialAdminPassword} = config;
      if (adminUser && adminUser.length && initialAdminPassword &&
          initialAdminPassword.length) {
        const userId = await this.#database.createUser(adminUser,
            initialAdminPassword);
        await this.#database.updateUserById(userId,
            {EmailConfirmed: true, ExpiredAfter: null});
        const adminRoleId = await this.#database.createRoleEmpty('admin'); // empty admin role
        await this.#database.assignRoleToUser(adminRoleId, userId);
      } else {
        throw new Error('adminUser or initialAdminPassword is not configured');
      }
    } else {
      console.log('At least one user exist. Not creating initial admin user.');
    }
  }

  async #importData(dbImporter, importDatafile) {
    const promises = [];
    for (const dbImportFunction of dbImporter) {
      if (_.isFunction(dbImportFunction)) {
        promises.push(dbImportFunction(this.#database, importDatafile));
      }
    }
    await Promise.all(promises);
  }

  async #exportData(dbExporter, exportDatafile) {
    const {exportDatafileWithTimestamp} = config;
    let exportDatafilePath = exportDatafile;
    if (exportDatafileWithTimestamp) {
      const pathObj = path.parse(exportDatafile);
      const now = DateTime.now();
      delete pathObj.base; // would have priority over name and ext
      pathObj.name = `${pathObj.name}-${now.toFormat('yyyy-LL-dd_hh-mm-ss')}`;
      exportDatafilePath = path.format(pathObj);
    }
    const promises = [];
    for (const dbExportFunction of dbExporter) {
      if (_.isFunction(dbExportFunction)) {
        promises.push(dbExportFunction(this.#database, exportDatafilePath));
      }
    }
    await Promise.all(promises);
  }

  async #initPassport() {
    // Note: session is not needed, if passport.session() below is not called
    // this.app.use(session({
    //   secret: config['express-session-secret'],
    //   resave: true,
    //   saveUninitialized: true,
    // }));
    this.app.use(passport.initialize());
    //    this.app.use(passport.session()); // don't use persistent login sessions
    const asPassport = new AsPassport(passport, this.#database);
    await asPassport.init();
  }

  #initApiRouter() {
    this.addRouter('/api/auth', authRouteConfig);
    this.addRouter('/api/role', roleRouteConfig);
    this.addRouter('/api/role', rolesRouteConfig);
    this.addRouter('/api/role', rolePermissionProfilesRouteConfig);
    this.addRouter('/api/permissionprofile', permissionProfilesRouteConfig);
    this.addRouter('/api/user', userRouteConfig);
    this.addRouter('/api/user', userByIdRouteConfig);
    this.addRouter('/api/user', userrolesRouteConfig);
  }

  async #startHttpServer() {
    this.#haveHttpServer = false;
    const {httpPort} = config;
    const {httpsPort} = config;
    if (httpsPort) {
      if (_.isString(this.#port)) {
        this.#port = parseInt(httpsPort, 10);
      } else {
        this.#port = httpsPort;
      }
      try {
        const {dataDirectory} = config;
        const pemDir = dataDirectory || this.#dirname;
        const secureOptions = {
          key: fs.readFileSync(path.resolve(pemDir, 'key.pem')),
          cert: fs.readFileSync(path.resolve(pemDir, 'cert.pem')),
        };
        // Create HTTPS server
        this.server = https.createServer(secureOptions, this.app);

        // Listen on provided port, on all network interfaces.
        this.server.listen(httpsPort, () => {
          console.log(
              `${this.appName} https server listening on port ${this.#port}`);
        });
        this.#haveHttpServer = true;
        this.#secure = true;
      } catch (e) {
        console.log('EXCEPTION while creating the https server:', e);
        throw e;
      }
    } else {
      try {
        if (_.isString(this.#port)) {
          this.#port = parseInt(httpPort, 10);
        } else {
          this.#port = httpPort;
        }
        // no https -> try http

        this.server = http.createServer(this.app);

        // Listen on provided port, on all network interfaces.
        this.server.listen(httpPort, () => {
          console.log(
              `${this.appName} http server listening on port ${this.#port}`);
        });
        this.#haveHttpServer = true;
      } catch (e) {
        console.log('EXCEPTION while creating the https server:', e);
        throw e;
      }
    }
    if (this.#haveHttpServer) {
      this.app.set('port', this.#port);
      this.server.on('error', (error) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof this.#port === 'string'
            ? `Pipe ${this.#port}`
            : `Port ${this.#port}`;

        // handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });
      this.server.on('listening', () => {
        const addr = this.server.address();
        const bind = typeof addr === 'string'
            ? `pipe ${addr}`
            : `port ${addr.port}`;
        debug(`Listening on ${bind}`);
      });
      this.server.on('connection', (socket) => {
        if (this.#httpServerTerminating) {
          socket.destroy();
        } else {
          this.#sockets.add(socket);

          socket.once('close', () => {
            this.#sockets.delete(socket);
          });
        }
      });

      this.server.on('secureConnection', (socket) => {
        if (this.#httpServerTerminating) {
          socket.destroy();
        } else {
          this.#secureSockets.add(socket);

          socket.once('close', () => {
            this.#secureSockets.delete(socket);
          });
        }
      });
    }
  }

  /**
   * Evaluate whether additional steps are required to destroy the socket.
   *
   * @see https://github.com/nodejs/node/blob/57bd715d527aba8dae56b975056961b0e429e91e/lib/_http_client.js#L363-L413
   */
  #destroySocket(socket) {
    socket.destroy();

    console.log('destroying sockets to terminate the http server');

    if (socket.server instanceof http.Server) {
      this.#sockets.delete(socket);
    } else {
      this.#secureSockets.delete(socket);
    }
  }

  // Code for terminateHttpServer take from https://github.com/gajus/http-terminator
  // Copyright (c) 2020, Gajus Kuizinas (http://gajus.com/)
  async terminateHttpServer() {
    if (this.#httpServerTerminating) {
      console.warn('already terminating HTTP server');
      return this.#httpServerTerminating;
    }

    return this.#httpServerTerminating = new Promise(
        async (resolve, reject) => {
          this.server.on('request', (incomingMessage, outgoingMessage) => {
            if (!outgoingMessage.headersSent) {
              outgoingMessage.setHeader('connection', 'close');
            }
          });

          for (const socket of this.#sockets) {
            // This is the HTTP CONNECT request socket.
            if (socket.server instanceof http.Server) {
              // eslint-disable-next-line no-underscore-dangle
              const serverResponse = socket._httpMessage;

              if (serverResponse) {
                if (!serverResponse.headersSent) {
                  serverResponse.setHeader('connection', 'close');
                }
              } else {
                this.#destroySocket(socket);
              }
            }
          }

          for (const socket of this.#secureSockets) {
            // @ts-expect-error Unclear if I am using wrong type or how else this should be handled.
            // eslint-disable-next-line no-underscore-dangle
            const serverResponse = socket._httpMessage;

            if (serverResponse) {
              if (!serverResponse.headersSent) {
                serverResponse.setHeader('connection', 'close');
              }
            } else {
              this.#destroySocket(socket);
            }
          }

          // Wait for all in-flight connections to drain, forcefully terminating any
          // open connections after the given timeout
          try {
            await waitFor(
                () => this.#sockets.size === 0 && this.#secureSockets.size ===
                    0, {
                  interval: 10,
                  timeout: 1000, // ms
                });
          } catch {
            // Ignore timeout errors
          } finally {
            for (const socket of this.#sockets) {
              this.#destroySocket(socket);
            }

            for (const socket of this.#secureSockets) {
              this.#destroySocket(socket);
            }
          }

          this.server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
  }

  async #isAllowed(userId, resource, method) {
    if (resource === '/api/auth' && method === 'post') {
      return true;
    }
    return this.#database.checkUserIsAllowed(userId, resource, method);
  }

  get secure() {
    return this.#secure;
  }

  addRouter(urlPath, routeConfig) {
    const router = express.Router();

    let corsOptions = {
      origin: config.CORS_origin,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    };

    if (process.env.NODE_ENV === 'development') {
      corsOptions = {
        origin: ['http://localhost:5173', 'https://localhost:5173'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        // allowedHeaders: ['Content-Type', 'Authorization', 'Location'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
        credentials: true,
      };
      this.app.use(CORS(corsOptions));
    }

    if (routeConfig && routeConfig.routes) {
      for (const verb of ['get', 'post', 'put', 'delete']) {
        if (routeConfig.routes[verb]) {
          const route = routeConfig.routes[verb];
          const {bypassAuth} = route;
          if (route.handler) {
            if (!bypassAuth) {
              this.#addAuthHandlerToRouter(router, verb, routeConfig);
              this.#addRoleHandlerToRouter(router, verb, routeConfig);
            }

            // normal request handler
            router[verb](routeConfig.path, route.handler);
          }
        }
      }
      // register the router with the app
      this.app.use(urlPath, router);
    }
  }

  #addRoleHandlerToRouter(router, verb, routeConfig) {
    // add the role basePermissions middleware to check users role has required basePermissions
    router[verb](routeConfig.path, (req, res, next) => {
      console.log('checking role basePermissions');
      let userId;
      if ((req.user) && (req.user.id)) {
        userId = req.user.id;
      } else {
        next(new HttpError(401, 'User not authenticated'));
      }

      const url = req.originalUrl.split('?')[0];
      let resource;
      if (!routeConfig.numPathComponents) {
        resource = url;
      } else {
        resource = url.split('/').
            slice(0, routeConfig.numPathComponents + 1).
            join('/');
      }

      // replace any number by :id
      const parts = resource.split('/');
      const partsCorrected = [];
      parts.forEach((p) => {
        if (p) {
          const x = parseInt(p, 10);
          if (Number.isNaN(x)) {
            partsCorrected.push(p);
          } else {
            partsCorrected.push(':id');
          }
        }
      });
      resource = '/' + partsCorrected.join('/');

      const action = req.method.toLowerCase();

      console.log(`Requesting ${action} on ${resource} by user ${userId}`);

      this.#isAllowed(userId, resource, action).then((allowed) => {
        if (allowed) {
          console.log(`Allowed ${action} on ${resource} by user ${userId}`);
          next();
        } else {
          console.log(`Not allowed ${action} on ${resource} by user ${userId}`);
          next(new HttpError(403,
              'Insufficient basePermissions to access resource'));
        }
      }).catch((reason) => {
        console.log(reason.message);
        next(new HttpError(500, 'Server error while checking basePermissions'));
      });
    });
  }

  #addAuthHandlerToRouter(router, verb, routeConfig) {
    router[verb](routeConfig.path, (req, res, next) => {
      console.log('passport authenticate');
      // check for bearer authentication header with token
      let token = '';
      if (req.headers && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2) {
          const scheme = parts[0];
          const credentials = parts[1];
          if (/^Bearer/i.test(scheme)) {
            token = credentials;
          }
        }
      }
      if (token) {
        passport.authenticate('bearer', {session: false})(req, res, next);
      } else {
        passport.authenticate('basic', {session: false})(req, res, next);
      }
    });
  }
}

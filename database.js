import _ from 'lodash';
import path from 'path';
import knex from 'knex';
import config from './config.js';

export default class DB {
  #dbClient;

  constructor(options) {
    // eslint-disable-next-line no-param-reassign,no-unused-expressions
    options || (options = {});

    const {
      dbHost, dbName, dbUsername, dbPassword, dbDebug,
    } = config;
    let {
      dbPort,
    } = config;

    if (_.isString(dbPort)) {
      dbPort = parseInt(dbPort, 10);
    }

    this.#dbClient = config.dbClient;

    const knexConfig = {
      client: this.#dbClient,
      debug: dbDebug,
      connection: {},
      pool: {
        min: 0, max: 30,
      },
    };

    switch (this.#dbClient) {
      case 'sqlite3': {
        const dbFilename = options.appName ? path.resolve(config.dataDirectory, `${options.appName}.sqlite`)
          : path.resolve(config.dataDirectory, 'app.sqlite');
        knexConfig.connection = {
          filename: config.dbFilename ? config.dbFilename : dbFilename,
        };
        knexConfig.useNullAsDefault = true;
        knexConfig.pool.afterCreate = (conn, cb) => conn.run('PRAGMA foreign_keys = ON', cb);
      }
        break;
      default:
        knexConfig.connection = {
          host: dbHost,
          port: dbPort,
          user: dbUsername,
          password: dbPassword,
          database: dbName,
          options: {
            encrypt: true,
            trustServerCertificate: true,
            requestTimeout: 30000,
          },
        };
    }

    this.knex = knex(knexConfig);

    if (_.isArray(options.mixins)) {
      for (const mixin of options.mixins) {
        let name = 'unknown';
        if (_.isFunction(mixin.getMixinName)) {
          name = mixin.getMixinName();
        }
        // eslint-disable-next-line no-console
        console.log(`Installing database mixin ${name}`);
        Object.assign(DB.prototype, mixin);
      }
    }
  }

  supportsILike() {
    return this.#dbClient !== 'sqlite3';
  }

  async startTransaction() {
    return this.knex.transaction();
  }

  async isSchemaOK(schema) {
    if (await this.#existsTable('Schema')) {
      const schemaVersion = schema.version;
      const schemaName = schema.name;
      const result = await this.knex.table('Schema').select().where({ name: schemaName });
      if (result.length === 0) {
        return false;
      }
      const currentSchema = result[0];
      console.log(`Current DB schema of ${schemaName} is ${currentSchema.version}. Expected is version ${schemaVersion}`);
      return schemaVersion <= currentSchema.version;
    }
    console.log('Schema table missing. Overall DB schema is not up to date.');
    return false;
  }

  async dropAllTables(schemas) {
    let tableNames = ['Schema'];
    for (const schema of schemas) {
      const tableNamesOfSchema = _.map(schema.tables, (tableDef) => tableDef.tableName);
      tableNames = tableNames.concat(tableNamesOfSchema);
    }
    const allTableNames = tableNames.reverse();
    console.log('Dropping the following tables:');
    for (const name of allTableNames) {
      console.log(name);
    }
    await this.#dropAll(allTableNames);
    console.log('Tables dropped');
  }

  async makeSchemaUpToDate(schema) {
    const tables = _.map(schema.tables, (tableDef) => tableDef.tableName).reverse();
    await this.#dropAll(tables);
    await this.#createTables(schema);
    await this.#fillTables(schema);
    if (!await this.#existsTable('Schema')) {
      await this.knex.schema.createTable('Schema', (t) => {
        t.string('name').primary();
        t.integer('version');
      });
    }
    await this.knex.table('Schema').where('name', schema.name).delete();
    await this.knex.table('Schema').insert({ name: schema.name, version: schema.version });
  }

  async #createTables(schema) {
    console.log(`Creating database tables of ${schema.name}......`);

    // CREATE TABLES
    for (const tableDef of schema.tables) {
      const { tableName } = tableDef;
      try {
        console.log(`creating table ${tableName}`);
        await this.knex.schema.createTable(tableName, (t) => {
          for (const column of tableDef.columns) {
            let tRes;
            switch (column.type) {
              case 'autoincrement':
                tRes = t.increments(column.name);
                break;
              case 'string':
                tRes = t.string(column.name, column.length);
                break;
              case 'text':
                tRes = t.text(column.name);
                break;
              case 'integer':
                tRes = t.integer(column.name);
                break;
              case 'decimal':
                tRes = t.decimal(column.name, column.precision, column.scale);
                break;
              case 'float':
                tRes = t.float(column.name, column.precision, column.scale);
                break;
              case 'date':
                tRes = t.date(column.name);
                break;
              case 'time':
                tRes = t.time(column.name);
                break;
              case 'dateTime':
                tRes = t.datetime(column.name);
                break;
              case 'boolean':
                tRes = t.boolean(column.name);
                break;
              default:
            }
            if (column.primary_key) {
              tRes = tRes.primary();
            }
            if (column.unique) {
              tRes = tRes.unique();
            }
            if (column.nullable === false) {
              tRes = tRes.notNullable();
            }
            if (column.default !== undefined) {
              tRes = tRes.defaultTo(column.default);
            }
          }
          if (_.isArray(tableDef.indexes)) {
            for (const index of tableDef.indexes) {
              const uniqueIndex = index.unique;
              if (uniqueIndex) {
                t.unique(index.columns, index.name);
              } else {
                t.index(index.columns, index.name);
              }
            }
          }
          if (_.isArray(tableDef.foreign_keys)) {
            for (const fk of tableDef.foreign_keys) {
              t.foreign(fk.columns, fk.name).references(fk.foreign_columns)
                .inTable(fk.foreign_table);
            }
          }
        });
      } catch (ex) {
        console.log(`creating table ${tableName} failed`);
        console.log(ex);
        throw ex;
      }
    }
  }

  async #fillTables(schema) {
    console.log(`Prefill database tables of schema ${schema.name}...`);

    // PREFILL TABLES
    for (const tableDef of schema.tables) {
      if (_.isArray(tableDef.values)) {
        const { tableName, values } = tableDef;
        try {
          console.log(`Prefill table ${tableName}`);
          for (const value of values) {
            // eslint-disable-next-line no-await-in-loop
            await this.knex(tableName).insert(value);
          }
        } catch (ex) {
          console.log(`Prefilling table ${tableName} failed`);
          console.log(ex);
          throw ex;
        }
      }
    }
  }

  async #existsTable(table, callback) {
    return await new Promise(async (resolve, reject) => {
      if (this.#dbClient === 'sqlite3') {
        //    knex.raw("SELECT count(*) FROM INFORMATION_SCHEMA.TABLES where TABLE_NAME='"
        //    + table + "'").then(function (queryResult) {
        this.knex('sqlite_master')
          .where({ type: 'table', name: table })
          .count('* as cnt')
          .then((queryResult) => {
            const { cnt } = queryResult[0];
            resolve(cnt > 0);
          })
          .catch((err) => {
            console.log(
              `Query to check whether table ${table} exists failed`,
            );
            reject(err);
          });
      } else {
        //    knex.raw("SELECT count(*) FROM INFORMATION_SCHEMA.TABLES where TABLE_NAME='"
        //    + table + "'").then(function (queryResult) {
        this.knex('INFORMATION_SCHEMA.TABLES').where({ TABLE_NAME: table }).count('* as cnt').then((queryResult) => {
          const { cnt } = queryResult[0];
          resolve(cnt > 0);
        })
          .catch((err) => {
            console.log(`Query to check whether table ${table} exists failed`);
            reject(err);
          });
      }
    });
  }

  // Execute all functions in the array serially
  async _switchSystemVersioningOff(table) {
    await new Promise(async (resolve, reject) => {
      this.knex.raw(`ALTER TABLE dbo.${table} SET (SYSTEM_VERSIONING = OFF)`).then(() => {
        console.log(`System versioning switched OFF for table ${table}`);
        resolve();
      }).catch((err) => {
        if (err.number === 13591) {
          // ignore error when system versioning is not turned on
          resolve();
        } else {
          console.log(`Switching system versioning off failed for table ${table}`);
          reject(err);
        }
      });
    });
  }

  async _switchSystemVersioningOn(table) {
    await new Promise(async (resolve, reject) => {
      this.knex.raw(`ALTER TABLE dbo.${table
      } ADD SysStartTime datetime2 GENERATED ALWAYS AS ROW START NOT NULL, SysEndTime datetime2 GENERATED ALWAYS AS ROW END NOT NULL, PERIOD FOR SYSTEM_TIME (SysStartTime,SysEndTime)`).then(
        () => {
          console.log(`System versioning switched ON for table ${table}`);
          resolve();
        },
      ).catch((err) => {
        console.log(`altering table ${table} failed`);
        reject(err);
      });
    });
  }

  async #dropAll(tables) {
    if (!_.isArray(tables)) {
      throw new Error('tables argument must be an array with table names');
    }

    for (const table of tables) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const exists = await this.#existsTable(table);
        if (exists) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise(async (resolve, reject) => {
            let dropSQL;
            if (this.#dbClient === 'sqlite3') {
              dropSQL = `DROP TABLE ${table}`;
            } else {
              dropSQL = `DROP TABLE dbo.${table}`;
            }
            this.knex.raw(dropSQL).then(() => {
              console.log(`Table ${table} dropped`);
              resolve();
            }).catch((err) => {
              console.log(`dropping table ${table} failed`);
              reject(err);
            });
          });
        } else {
          console.log(`Table ${table} not dropping, because it does not exist.`);
        }
      } catch (ex) {
        console.log(`checking for table ${table} failed`);
        throw ex;
      }
    }
  }
}

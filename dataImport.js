import {AsExpress} from 'as-express';
import dbSchema from './dbSchema.js';
import yaml from 'js-yaml';
import fs from 'fs';
import _ from 'lodash';
import knex from 'knex';
import dbMixinAccounts from "./dbMixinAccounts.js";
import dbMixinTransactions from "./dbMixinTransactions.js";
import { DateTime } from 'luxon';

const settingsFilename = 'import.yaml';
let settings = {};
if (fs.existsSync(settingsFilename)) {
  try {
    settings = yaml.load(fs.readFileSync(settingsFilename, 'utf8'));
  } catch (ex) {
    console.log(`${ex.message}: can't read ${settingsFilename}. Using defaults only.`);
  }
}

const config = {};
_.defaults(config, settings, {
  dbDebug: false,
  dbClient: 'sqlite3',
  dBFilename: './importData.sqlite',
  dbHost: '127.0.0.1',
  dbPort: 1433,
  dbName: 'xxxx',
  dbUsername: 'somebody',
  dbPassword: 'secret',
});

async function importData(database) {
  class App {
    #kv = {};

    use() {
    }

    set(k, v) {
      this.#kv[k] = v;
    }
    get(k) {
      return this.#kv[k];
    }
  }

  if (!database) {
    const app = new App();

    const asExpress = new AsExpress('as-express-test', app);
    await asExpress.init({
      dbSchema: dbSchema,
      dbMixins: [dbMixinAccounts, dbMixinTransactions],
    });

    database = app.get('database');
  }

  const {
    dbHost, dbName, dbUsername, dbPassword, dbDebug,
  } = config;
  let {
    dbPort,
  } = config;

  if (_.isString(dbPort)) {
    dbPort = parseInt(dbPort, 10);
  }

  const knexConfig = {
    client: config.dbClient,
    debug: dbDebug,
    connection: {},
    pool: {
      min: 0, max: 30,
    },
  };

  switch (config.dbClient) {
    case 'mssql': {
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
      break;
    }
  }

  const k = knex(knexConfig);
  const result = await k.table('s_konten').select();
  const promises = [];
  const closedDate = DateTime.fromISO('2100-12-01');
  console.log('Importing Accounts...');
  for (const resultElement of result) {
    const iban = (resultElement.IBAN === undefined || resultElement.IBAN === null || resultElement.IBAN?.trim() === '') ? null: resultElement.IBAN.trim();
    const number = (resultElement.Nummer === undefined || resultElement.Nummer === null || resultElement.Nummer?.trim() === '') ? null: resultElement.Nummer.trim();
    const closedAt = DateTime.fromISO(resultElement.geschlossen.toISOString());
    const notClosed = !resultElement.geschlossen || closedAt > closedDate;
    const id = await database.addAccount({
      name: resultElement.Bezeichnung.trim(),
      iban: iban,
      number: number,
      idCurrency: resultElement.Waehrung,
      startBalance: resultElement.Anfangsbestand,
      closedAt: notClosed ? null : resultElement.geschlossen,
    });
    console.log(`Account with id ${id[0].id} inserted`);
  }
  console.log('Imported Accounts');


}

export default importData;
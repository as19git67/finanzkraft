import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import knex from 'knex';
import {DateTime} from 'luxon';
import {writeFile} from 'node:fs/promises';

const settingsFilename = 'export.yaml';
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
  outputFile: 'export.json',
  dataDirectory: '/tmp/finanzkraft_data'
});

async function exportData() {

  const {
    dbHost, dbName, dbUsername, dbPassword, dbDebug, outputFile, dataDirectory,
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
  const data = {};

  let result = await k.table('s_konten').select();
  data.accounts = [];
  const closedDate = DateTime.fromISO('1970-01-01');
  const notClosedDate = DateTime.fromISO('2100-12-01');
  console.log('Exporting accounts...');
  for (const resultElement of result) {
    const iban = (resultElement.IBAN === undefined || resultElement.IBAN === null || resultElement.IBAN?.trim() ===
                  '') ? null : resultElement.IBAN.trim();
    const number = (resultElement.Nummer === undefined || resultElement.Nummer === null ||
                    resultElement.Nummer?.trim() === '') ? null : resultElement.Nummer.trim();
    let closedAt = DateTime.fromISO(resultElement.geschlossen.toISOString());
    if (resultElement.deleted && resultElement.geschlossen && closedAt > notClosedDate ) {
      closedAt = closedDate;
    }
    if (closedAt > notClosedDate) {
      closedAt = null;
    }
    data.accounts.push({
      name: resultElement.Bezeichnung.trim(),
      iban: iban,
      number: number,
      idCurrency: resultElement.Waehrung,
      startBalance: resultElement.Anfangsbestand,
      closedAt: closedAt,
    });
  }
  console.log(`${data.accounts.length} accounts exported`);

  console.log(`Exporting categories...`);
  const catResults = await k.table('s_kategorien');
  const categories = {};
  for (const cat of catResults) {
    categories[cat.id_category] = cat;
  }
  console.log(`${Object.keys(categories).length} categories exported`);
  console.log(`Exporting transactions...`);

  data.transactions = [];
  result = await k.table('transaction_split').select('transaction_split.sequence as ts_sequence',
    'transaction_split.id_transaction_original as ts_id_tr_original',
    'transaction.id_originaltransaction as t_id_tr_original',
    'transaction.id_transaction as t_id',
    'transaction.Datum as t_valueDate',
    'transaction.Betrag as t_amount',
    'transaction.Verwendungszweck as t_text',
    'transaction.primaNotaNo as t_prima_nota_no',
    'transaction.zkaTranCode as t_zka_tr_code',
    'transaction.buchungstext as t_type',
    's_konten.Bezeichnung as account_name',
    's_konten.id_konto as account_id',
    's_kategorien.id_category as cat_id',
    's_kategorien.id_parent_category as cat_parent_id',
    's_kategorien.Name as cat_name',
    'zahlungsempfaenger.Name as payee',
    'accountbalance.Betrag as bal_saldo',
    )
  .rightJoin('transaction', function () {
    this.on('transaction.id_transaction', '=', 'transaction_split.id_transaction');
    this.andOnNull('transaction.valid_end');
  })
  .where('transaction.deleted', false)
    .andWhere('transaction.valid_end', null)
  .leftJoin('accountbalance', function() {
    this.on('transaction.id_accountbalance', '=', 'accountbalance.id_balance');
  })
  .leftJoin('s_kategorien', function() {
    this.on('transaction.id_category', '=', 's_kategorien.id_category');
  })
    .leftJoin('s_konten', function() {
      this.on('transaction.id_konto', '=', 's_konten.id_konto');
    })
    .leftJoin('zahlungsempfaenger', function() {
      this.on('transaction.id_zahlungsempfaenger', '=', 'zahlungsempfaenger.id_zahlungsempfaenger');
    })

  for (const resultElement of result) {
    let category = resultElement.cat_name.trim();
    const cp = categories[resultElement.cat_parent_id];
    if (cp && cp.Name) {
      category = `${cp.Name.trim()}:${category}`;
    }
    if (category === 'EINNAHMEN:Keine' || category === '-') {
      category = null;
    }
    let payee = resultElement.payee?.trim() ? resultElement.payee?.trim() : null;
    if (payee === 'Unbekannt') {
      payee = null;
    }
    data.transactions.push({
      ts_sequence: resultElement.ts_sequence,
      ts_id_tr_original: resultElement.ts_id_tr_original,
      t_id_tr_original: resultElement.t_id_tr_original,
      t_id: resultElement.t_id,
      account_id: resultElement.account_id,
      account_name: resultElement.account_name.trim(),
      t_valueDate: resultElement.t_valueDate,
      t_amount: resultElement.t_amount,
      t_text: resultElement.t_text?.trim(),
      t_type: resultElement.t_type?.trim(),
      t_prima_nota_no: resultElement.t_prima_nota_no,
      t_zka_tr_code: resultElement?.t_zka_tr_code?.trim(),
      category: category,
      payee: payee,
      bal_saldo: resultElement.bal_saldo,
    });
  }


  console.log(`Exporting ${result.length} transactions...`)

  const json = JSON.stringify(data, undefined, 2);
  const dataBuffer = new Uint8Array(Buffer.from(json));
  const filename = path.resolve(dataDirectory, outputFile);
  await writeFile(filename, dataBuffer, 'utf8');
  console.log(`DB export written to ${filename}`);
}

exportData().then(() => {
  console.log("Export finished");
}).catch((reason) => {
  console.log(reason);
});

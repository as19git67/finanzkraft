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
    console.log(
        `${ex.message}: can't read ${settingsFilename}. Using defaults only.`);
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
  dataDirectory: '/tmp/finanzkraft_data',
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
    client: config.dbClient, debug: dbDebug, connection: {}, pool: {
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
          encrypt: true, trustServerCertificate: true, requestTimeout: 30000,
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
    const iban = (resultElement.IBAN === undefined || resultElement.IBAN ===
        null || resultElement.IBAN?.trim() === '') ?
        null :
        resultElement.IBAN.trim();
    const number = (resultElement.Nummer === undefined ||
        resultElement.Nummer === null || resultElement.Nummer?.trim() === '') ?
        null :
        resultElement.Nummer.trim();
    let closedAt = DateTime.fromISO(resultElement.geschlossen.toISOString());
    if (resultElement.deleted && resultElement.geschlossen && closedAt >
        notClosedDate) {
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
  result = await k.table('transaction_split').
      select('transaction_split.sequence as ts_sequence',
          'transaction_split.id_transaction_original as ts_id_tr_original',
          'transaction.id_originaltransaction as t_id_tr_original',
          'transaction.id_transaction as t_id',
          'transaction.Datum as t_valueDate', 'transaction.Betrag as t_amount',
          'transaction.Verwendungszweck as t_text',
          'transaction.primaNotaNo as t_prima_nota_no',
          'transaction.zkaTranCode as t_zka_tr_code',
          'transaction.buchungstext as t_type',
          's_konten.Bezeichnung as account_name',
          's_konten.id_konto as account_id',
          's_kategorien.id_category as cat_id',
          's_kategorien.id_parent_category as cat_parent_id',
          's_kategorien.Name as cat_name', 'zahlungsempfaenger.Name as payee',
          'accountbalance.Betrag as bal_saldo').
      rightJoin('transaction', function() {
        this.on('transaction.id_transaction', '=',
            'transaction_split.id_transaction');
        this.andOnNull('transaction.valid_end');
      }).
      where('transaction.deleted', false).
      andWhere('transaction.valid_end', null).
      leftJoin('accountbalance', function() {
        this.on('transaction.id_accountbalance', '=',
            'accountbalance.id_balance');
      }).
      leftJoin('s_kategorien', function() {
        this.on('transaction.id_category', '=', 's_kategorien.id_category');
      }).
      leftJoin('s_konten', function() {
        this.on('transaction.id_konto', '=', 's_konten.id_konto');
      }).
      leftJoin('zahlungsempfaenger', function() {
        this.on('transaction.id_zahlungsempfaenger', '=',
            'zahlungsempfaenger.id_zahlungsempfaenger');
      });

  const missingMappings = {};
  const catMappings = getCatMappings();
  // const catCache = {};
  for (const resultElement of result) {
    let category = resultElement.cat_name.trim();
    const cp = categories[resultElement.cat_parent_id];
    if (cp && cp.Name) {
      category = `${cp.Name.trim()}:${category}`;
    }
    if (category === 'EINNAHMEN:Keine' || category === '-') {
      category = null;
    }
    // if (category) {
    //   catCache[category] = category;
    // }

    let payee = resultElement.payee?.trim() ?
        resultElement.payee?.trim() :
        null;
    if (payee === 'Unbekannt') {
      payee = null;
    }
    if (!catMappings[category]) {
      if (category && !missingMappings[category]) {
        console.log(`WARNING: Unknown category ${category}`);
        missingMappings[category] = category;
      }
      continue;
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
      category: category ? catMappings[category].category : null,
      transferAccount: category ? catMappings[category].transferAccount : null,
      tags: category ? catMappings[category].tags : [],
      orig_category: category,
      payee: payee,
      bal_saldo: resultElement.bal_saldo,
    });
  }

  const missingCategories = _.values(missingMappings).sort();
  missingCategories.forEach((cat) => {
    console.log(`{'old': '${cat}', 'new': '', 'tags': []},`);
  });

  // data.categories = [];
  // const c = _.values(catCache).sort();
  // c.forEach((cat) => {
  //   data.categories.push({
  //     old: cat,
  //     new: '',
  //   });
  // });
  // delete data.transactions;
  // delete data.accounts;

  console.log(`Exporting ${result.length} transactions...`);

  const json = JSON.stringify(data, undefined, 2);
  const dataBuffer = new Uint8Array(Buffer.from(json));
  const filename = path.resolve(dataDirectory, outputFile);
  await writeFile(filename, dataBuffer, 'utf8');
  console.log(`DB export written to ${filename}`);
}

function getCatMappings() {
  const catMappings = [
    {'old': 'AUSGABEN:Isabella', 'new': 'Kinder allgemein', 'tags': ['Isabella']},
    {'old': 'AUSGABEN:Manuel', 'new': 'Kinder allgemein', 'tags': ['Manuel']},
    {'old': 'AUSGABEN:USA', 'new': 'Sonstiges', 'tags': ['USA-Aufenthalt']},
    {'old': 'AUSGABEN:Umb. auf gelöschtes Konto', 'new': 'Umbuchungen', 'tags': []},
    {'old': 'AUSGABEN:Verschiedenes Martina', 'new': 'Sonstiges', 'tags': ['Martina']},
    {'old': 'AUSGABEN:Verzichtbar', 'new': 'Sonstiges', 'tags': ['verzichtbar']},
    {'old': 'AUSGABEN:Werbungskosten', 'new': 'Sonstiges', 'tags': ['Werbungskosten']},
    {'old': 'Ausg. für Kap.-Anlagen:Bausparvertrag', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Bausparvertrag']},
    {'old': 'Ausg. für Kap.-Anlagen:Crypto', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Crypto']},
    {'old': 'Ausg. für Kap.-Anlagen:Eutin', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Eutin']},
    {'old': 'Ausg. für Kap.-Anlagen:Eutin (Darlehen)', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Eutin', 'Darlehen']},
    {'old': 'Ausg. für Kap.-Anlagen:Eutin (Grundsteuer)', 'new': 'Steuern', tags: ['Kapital', 'Grundsteuer B', 'Eutin']},
    {'old': 'Ausg. für Kap.-Anlagen:Festgeldanlage', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Festgeld']},
    {'old': 'Ausg. für Kap.-Anlagen:Timber 2', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Timber 2']},
    {'old': 'Ausg. für Kap.-Anlagen:Wertpapier Order Gebühren', 'new': 'Bank & Finanzen', 'tags': ['Gebühren']},
    {'old': 'Ausg. für Kap.-Anlagen:Wertpapierkauf', 'new': 'Bank & Finanzen', 'tags': ['Kapital', 'Wertpapierkauf']},
    {'old': 'EINNAHMEN', 'new': 'Sonstige Einnahmen', 'tags': []},
    {'old': 'EINNAHMEN:Eink. aus Kap.-Anlagen', 'new': 'Erträge', 'tags': ['Kapital']},
    {'old': 'EINNAHMEN:Geschenke - Einnahmen', 'new': 'Sonstige Einnahmen', 'tags': ['Geschenke']},
    {'old': 'EINNAHMEN:Lohn und Gehalt', 'new': 'Lohn & Gehalt', 'tags': []},
    {'old': 'EINNAHMEN:Pacht', 'new': 'Erträge', 'tags': ['Pacht', 'Landwirtschaft']},
    {'old': 'EINNAHMEN:Sonstige Einkünfte', 'new': 'Erträge', 'tags': []},
    {'old': 'EINNAHMEN:Verkauf Kindersachen', 'new': 'Erträge', 'tags': ['Gebrauchtwarenverkauf']},
    {'old': 'Eink. aus Kap.-Anlagen:Dividenden', 'new': 'Erträge', 'tags': ['Kapital', 'Dividenden']},
    {'old': 'Eink. aus Kap.-Anlagen:Festgeld Ablauf', 'new': 'Erträge', 'tags': ['Kapital', 'Festgeld']},
    {'old': 'Eink. aus Kap.-Anlagen:Kapitalgewinne', 'new': 'Erträge', 'tags': ['Kapital']},
    {'old': 'Eink. aus Kap.-Anlagen:Langfr. Kursgewinne', 'new': 'Erträge', 'tags': ['Kapital', 'Kursgewinn']},
    {'old': 'Eink. aus Kap.-Anlagen:Miete Immobilie Eutin', 'new': 'Erträge', 'tags': ['Kapital', 'Miete', 'Eutin']},
    {'old': 'Eink. aus Kap.-Anlagen:Sparbrief Ablauf', 'new': 'Erträge', 'tags': ['Kapital', 'Sparbrief']},
    {'old': 'Eink. aus Kap.-Anlagen:Wertpapierverkauf', 'new': 'Erträge', 'tags': ['Kapital', 'Wertpapierkauf']},
    {'old': 'Eink. aus Kap.-Anlagen:Zinsen', 'new': 'Erträge', 'tags': ['Kapital', 'Zinsen']},
    {'old': 'Eink. aus Kap.-Anlagen:Zinsen Isabella', 'new': 'Erträge', 'tags': ['Isabella', 'Zinsen']},
    {'old': 'Eink. aus Kap.-Anlagen:Zinsen Manuel', 'new': 'Erträge', 'tags': ['Manuel', 'Zinsen']},
    {'old': 'Hausbau - Einnahmen:Eigenheimzulage', 'new': 'Staatliche Zuschüsse', 'tags': ['Hausbau', 'Eigenheimzulage']},
    {'old': 'Isabella:Arztkosten Isabella', 'new': 'Gesundheit & Pflege', 'tags': ['Isabella']},
    {'old': 'Isabella:Freizeit', 'new': 'Freizeit & Hobby', 'tags': ['Isabella']},
    {'old': 'Isabella:Führerschein', 'new': 'Bildung & Weiterbildung', 'tags': ['Isabella', 'Führerschein']},
    {'old': 'Isabella:Geschenke', 'new': 'Geschenke', 'tags': ['Isabella', 'Geschenke']},
    {'old': 'Isabella:Hort Isabella', 'new': 'Bildung & Weiterbildung', 'tags': ['Isabella', 'Hort']},
    {'old': 'Isabella:Kindergarten Isabella', 'new': 'Kinder allgemein', 'tags': ['Isabella', 'Kindergarten']},
    {'old': 'Isabella:Kleidung', 'new': 'Kleidung & Mode', 'tags': ['Isabella']},
    {'old': 'Isabella:Mittagsbetreuung Isabella', 'new': 'Bildung & Weiterbildung', 'tags': ['Isabella', 'Mittagsbetreuung']},
    {'old': 'Isabella:Reiten', 'new': 'Freizeit & Hobby', 'tags': ['Isabella', 'Reiten']},
    {'old': 'Isabella:Schule Isabella', 'new': 'Bildung & Weiterbildung', 'tags': ['Isabella', 'Schule']},
    {'old': 'Isabella:Sonstiges', 'new': 'Sonstiges', 'tags': ['Isabella']},
    {'old': 'Isabella:Sparen', 'new': 'Bank & Finanzen', 'tags': ['Isabella', 'Sparen']},
    {'old': 'Isabella:Taschengeld', 'new': 'Bank & Finanzen', 'tags': ['Isabella', 'Taschengeld']},
    {'old': 'Isabella:Verbrauchsmaterial', 'new': 'Sonstiges', 'tags': ['Isabella']},
    {'old': 'Isabella:Versicherung_KinderPolice', 'new': 'Versicherungen', 'tags': ['Kinderpolice', 'Isabella']},
    {'old': 'Isabella:Versicherung_KÄNGURU.invest', 'new': 'Versicherungen', 'tags': ['KÄNGURU.invest', 'Isabella']},
    {'old': 'Kinder:Spiel- und Bastelzeug', 'new': 'Freizeit & Hobby', 'tags': ['Kinder', 'Spiel- und Bastelzeug']},
    {'old': 'Lohn und Gehalt:Gehalt Martina', 'new': 'Lohn & Gehalt', 'tags': ['Martina']},
    {'old': 'Lohn und Gehalt:Nettovergütung', 'new': 'Lohn & Gehalt', 'tags': ['Martina']},
    {'old': 'Lohn und Gehalt:Steuerfreie Einkünfte', 'new': 'Lohn & Gehalt', 'tags': ['Martina', 'steuerfrei']},
    {'old': 'Lohn und Gehalt:Steuernachzahlung', 'new': 'Steuern', 'tags': ['Steuernachzahlung']},
    {'old': 'Lohn und Gehalt:Steuerrückerstattung', 'new': 'Lohn & Gehalt', 'tags': ['Steuerrückerstattung']},
    {'old': 'Lohn und Gehalt:VWL', 'new': 'Lohn & Gehalt', 'tags': ['Vermögenswirksame Leistungen']},
    {'old': 'Manuel:Arztkosten Manuel', 'new': 'Gesundheit & Pflege', 'tags': ['Manuel']},
    {'old': 'Manuel:Freizeit', 'new': 'Freizeit & Hobby', 'tags': ['Manuel']},
    {'old': 'Manuel:Friseur', 'new': 'Kleidung & Mode', 'tags': ['Manuel', 'Friseur']},
    {'old': 'Manuel:Gaming', 'new': 'Freizeit & Hobby', 'tags': ['Manuel', 'Gaming']},
    {'old': 'Manuel:Geschenke', 'new': 'Geschenke', 'tags': ['Manuel']},
    {'old': 'Manuel:Kindergarten Manuel', 'new': 'Kinder allgemein', 'tags': ['Manuel', 'Kindergarten']},
    {'old': 'Manuel:Kleidung', 'new': 'Kleidung & Mode', 'tags': ['Manuel']},
    {'old': 'Manuel:Mittagsbetreuung Manuel', 'new': 'Bildung & Weiterbildung', 'tags': ['Manuel', 'Mittagsbetreuung']},
    {'old': 'Manuel:Schule Manuel', 'new': 'Bildung & Weiterbildung', 'tags': ['Manuel', 'Schule']},
    {'old': 'Manuel:Sonstiges', 'new': 'Sonstiges', 'tags': ['Manuel']},
    {'old': 'Manuel:Sparen', 'new': 'Bank & Finanzen', 'tags': ['Manuel', 'Sparen']},
    {'old': 'Manuel:Taschengeld', 'new': 'Bank & Finanzen', 'tags': ['Manuel', 'Taschengeld']},
    {'old': 'Manuel:Taschengeldt', 'new': 'Kinder allgemein', 'tags': ['Manuel']},
    {'old': 'Manuel:Verbrauchsmaterial', 'new': 'Sonstiges', 'tags': ['Manuel']},
    {'old': 'Manuel:Versicherung_KinderPolice', 'new': 'Versicherungen', 'tags': ['Manuel', 'Kinderpolice']},
    {'old': 'Manuel:Versicherung_KÄNGURU.invest', 'new': 'Versicherungen', 'tags': ['Manuel', 'KÄNGURU.invest']},
    {'old': 'PKV:Apotheke', 'new': 'Gesundheit & Pflege', 'tags': ['PKV', 'Apotheke']},
    {'old': 'PKV:Leistungsabrechnung', 'new': 'Gesundheit & Pflege – Erstattungen', 'tags': ['PKV', 'Leistungsabrechnung']},
    {'old': 'PKV:Rechnung PKV', 'new': 'Gesundheit & Pflege', 'tags': ['PKV', 'Rechnung']},
    {'old': 'Photovolataik:Einspeisevergütung', 'new': 'Erträge', 'tags': ['PV', 'Einspeisevergütung']},
    {'old': 'Photovolataik:Installation und Wartung', 'new': 'Reparaturen, Renovierung & Hausbau', 'tags': ['PV', 'Installation']},
    {'old': 'Versicherung:BU Versicherung (Basler) Anton', 'new': 'Versicherungen', 'tags': ['Anton', 'Basler', 'BU']},
    {'old': 'Versicherung:BU Versicherung Martina', 'new': 'Versicherungen', 'tags': ['Martina', 'BU']},
    {'old': 'Versicherung:Brandversicherung', 'new': 'Versicherungen', 'tags': ['Brandversicherung']},
    {'old': 'Versicherung:Generali 3-Phasen-Rente 1-34.952.273-0', 'new': 'Versicherungen', 'tags': ['Martina','Generali 3-Phasen-Rente 1-34.952.273-0']},
    {'old': 'Versicherung:Generali 3D Pflegev. 1-34.952.204-4', 'new': 'Versicherungen', 'tags': ['Martina','Generali 3D Pflegev. 1-34.952.204-4']},
    {'old': 'Versicherung:Haftpflichtversicherung', 'new': 'Versicherungen', 'tags': ['Haftpflichtversicherung']},
    {'old': 'Versicherung:Hausrat', 'new': 'Versicherungen', 'tags': ['Hausrat']},
    {'old': 'Versicherung:Krankenversicherung', 'new': 'Versicherungen', 'tags': ['Krankenversicherung']},
    {'old': 'Versicherung:Krankenversicherung Anton', 'new': 'Versicherungen', 'tags': ['Anton', 'Krankenversicherung']},
    {'old': 'Versicherung:Krankenversicherung Isabella', 'new': 'Versicherungen', 'tags': ['Isabella', 'Krankenversicherung']},
    {'old': 'Versicherung:Krankenversicherung Martina', 'new': 'Versicherungen', 'tags': ['Martina', 'Krankenversicherung']},
    {'old': 'Versicherung:Lebensversicherung', 'new': 'Versicherungen', 'tags': ['Lebensversicherung']},
    {'old': 'Versicherung:Lebensversicherung 5000127', 'new': 'Versicherungen', 'tags': ['Anton', 'LV 5000127']},
    {'old': 'Versicherung:Lebensversicherung 5000127-01', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','MLP 5000127-01']},
    {'old': 'Versicherung:Lebensversicherung 5000127-03', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','MLP 5000127-03']},
    {'old': 'Versicherung:Lebensversicherung 5000127-04', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','MLP 5000127-04']},
    {'old': 'Versicherung:Lebensversicherung HDI 504309', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','HDI 504309']},
    {'old': 'Versicherung:Lebensversicherung S-01225520-01', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','S-01225520-01']},
    {'old': 'Versicherung:Lebensversicherung S-01323071-01', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','S-01323071-01']},
    {'old': 'Versicherung:Lebensversicherung_AXA_26218145001', 'new': 'Versicherungen', 'tags': ['Anton', 'LV','AXA_26218145001']},
    {'old': 'Versicherung:Rechtsschutzversicherung', 'new': 'Versicherungen', 'tags': ['Rechtsschutzversicherung']},
    {'old': 'Versicherung:Reisekrankenversicherung Martina', 'new': 'Versicherungen', 'tags': ['Martina', 'Reisekrankenversicherung']},
    {'old': 'Versicherung:Reiseversicherung', 'new': 'Versicherungen', 'tags': ['Reiseversicherung']},
    {'old': 'Versicherung:Rentenversicherung', 'new': 'Versicherungen', 'tags': ['Rentenversicherung']},
    {'old': 'Versicherung:Riester_1_Anton', 'new': 'Versicherungen', 'tags': ['Anton', 'Riester 1']},
    {'old': 'Versicherung:Riester_2_Anton', 'new': 'Versicherungen', 'tags': ['Anton', 'Riester 2']},
    {'old': 'Versicherung:Riester_Martina', 'new': 'Versicherungen', 'tags': ['Martina', 'Riester']},
    {'old': 'Versicherung:Traktor', 'new': 'Versicherungen', 'tags': ['Landwirtschaft', 'Traktor']},
    {'old': 'Versicherung:Wohngebäudeversicherung', 'new': 'Versicherungen', 'tags': ['Wohngebäudeversicherung']},
    {'old': 'Versicherung:Zahnzusatzversicherung Martina', 'new': 'Versicherungen', 'tags': ['Martina', 'Zahnzusatzversicherung']},
    {'old': 'Verzichtbar:Informatik eBooks', 'new': 'Bildung & Weiterbildung', 'tags': ['Buch']},
    {'old': 'Verzichtbar:Mac Apps', 'new': 'Computer', 'tags': ['Software', 'Mac']},
    {'old': 'Verzichtbar:Medien', 'new': 'Freizeit & Hobby', 'tags': ['Medien']},
    {'old': 'Verzichtbar:Mobilfunk Gebühren', 'new': 'Fixkosten & Verträge', 'tags': ['Mobilfunk']},
    {'old': 'Verzichtbar:PC Apps', 'new': 'Computer', 'tags': ['Software', 'PC']},
    {'old': 'Verzichtbar:Spenden', 'new': 'Geschenke', 'tags': ['Spenden']},
    {'old': 'Verzichtbar:Sport', 'new': 'Freizeit & Hobby', 'tags': ['Sport']},
    {'old': 'Verzichtbar:TMow Entwicklung', 'new': 'Freizeit & Hobby', 'tags': ['TMow']},
    {'old': 'Verzichtbar:Vereinsbeitrag', 'new': 'Freizeit & Hobby', 'tags': ['Vereinsbeitrag']},
    {'old': 'Verzichtbar:Werkstatt', 'new': 'Freizeit & Hobby', 'tags': ['Werkstatt']},
    {'old': 'Verzichtbar:eBay - Allgemein', 'new': 'Sonstiges', 'tags': ['eBay']},
    {'old': 'Verzichtbar:iPhone Apps', 'new': 'Software', 'tags': ['iPhone']},
    {'old': 'Verzichtbar:iPhone Apps (Spiele)', 'new': 'Software', 'tags': ['iPhone', 'Spiele']},
    {'old': 'Verzögern', 'new': 'Bildung & Weiterbildung', 'tags': ['Fachliteratur', 'Werbungskosten']},
    {'old': 'Werbungskosten:Arbeitsmittel', 'new': 'Sonstiges', 'tags': ['Arbeitsmittel', 'Werbungskosten']},
    {'old': 'Werbungskosten:Bahnrad', 'new': 'Sonstiges', 'tags': ['Arbeitsweg', 'Werbungskosten']},
    {'old': 'Werbungskosten:Fachliteratur', 'new': 'Bildung & Weiterbildung', 'tags': ['Fachliteratur', 'Werbungskosten']},
    {'old': 'Werbungskosten:Fahrtkosten Martina', 'new': 'Mobilität & Transport', 'tags': ['Fahrtkosten', 'Martina', 'Werbungskosten']},
    {'old': 'Werbungskosten:Reisekosten', 'new': 'Sonstiges', 'tags': ['Reisekosten', 'Werbungskosten']},
    {'old': 'Werbungskosten:Steuerberatungskosten', 'new': 'Steuern', 'tags': ['Steuerberatungskosten', 'Werbungskosten']},
    {'old': 'Werbungskosten:Steuerprogramm', 'new': 'Software', 'tags': ['Steuerprogramm', 'Werbungskosten']},
    {'old': 'eBay', 'new': 'Sonstiges', 'tags': ['eBay']},
    {'old': 'AUSGABEN', 'new': 'Sonstiges'},
    {'old': 'AUSGABEN:Ausbildung', 'new': 'Bildung & Weiterbildung'},
    {'old': 'Ausbildung:Bafög', 'new': 'Bildung & Weiterbildung'},
    {'old': 'Ausbildung:Konferenz', 'new': 'Bildung & Weiterbildung'},
    {'old': 'Ausbildung:Spanisch', 'new': 'Bildung & Weiterbildung'},
    {'old': 'Ausbildung:VHS', 'new': 'Bildung & Weiterbildung'},
    {'old': 'AUSGABEN:Bankgebühren', 'new': 'Bank & Finanzen', tags: ['Gebühren']},
    {'old': 'Bankgebühren:Depotgebühren', 'new': 'Bank & Finanzen', tags: ['Gebühren']},
    {'old': 'Bankgebühren:Geldautomat', 'new': 'Bank & Finanzen'},
    {'old': 'Bankgebühren:Kontoführungsgebühren', 'new': 'Bank & Finanzen', tags: ['Gebühren']},
    {'old': 'Bankgebühren:Kreditkarte', 'new': 'Bank & Finanzen'},
    {
      'old': 'Bankgebühren:Kreditkarte Auslandseinsatz',
      'new': 'Bank & Finanzen', tags: ['Gebühren'],
    },
    {'old': 'Bankgebühren:Microsoft Investor', 'new': 'Bank & Finanzen', tags: ['Gebühren']},
    {'old': 'Bankgebühren:Sollzinsen', 'new': 'Bank & Finanzen', tags: ['Zinsen']},
    {'old': 'AUSGABEN:Eltern', 'new': 'Familie & Unterstützung', tags: ['Eltern']},
    {'old': 'Eltern:Haus', 'new': 'Familie & Unterstützung', tags: ['Eltern']},
    {'old': 'AUSGABEN:Essen', 'new': 'Lebensmittel & Verpflegung'},
    {'old': 'Essen:Isabella Schule', 'new': 'Lebensmittel & Verpflegung', tags: ['Isabella Schule']},
    {'old': 'Essen:Kantine Anton', 'new': 'Lebensmittel & Verpflegung', tags: ['Anton Arbeit']},
    {'old': 'Essen:Manuel Schule', 'new': 'Lebensmittel & Verpflegung', tags: ['Manuel Schule']},
    {'old': 'Essen:Mittag Martina', 'new': 'Lebensmittel & Verpflegung', tags: ['Martina Arbeit']},
    {'old': 'Essen:gemeinsam', 'new': 'Lebensmittel & Verpflegung'},
    {'old': 'Essen:verzichtbar', 'new': 'Restaurant'},
    {'old': 'AUSGABEN:Freizeit', 'new': 'Freizeit & Hobby'},
    {'old': 'Freizeit:Anton Veranstaltungen', 'new': 'Freizeit & Hobby'},
    {'old': 'Freizeit:Eintritt', 'new': 'Freizeit & Hobby', tags: ['Eintritt']},
    {'old': 'Freizeit:Fahrkarten', 'new': 'Freizeit & Hobby'},
    {'old': 'Freizeit:Martina Freizeit', 'new': 'Freizeit & Hobby', tags: ['Martina']},
    {'old': 'Freizeit:Skifahren', 'new': 'Freizeit & Hobby', tags: ['Skifahren']},
    {'old': 'Freizeit:Urlaub', 'new': 'Reisen & Urlaub'},
    {'old': 'AUSGABEN:Geschenke', 'new': 'Geschenke'},
    {'old': 'Geschenke:Anton Geschenke', 'new': 'Geschenke', tags: ['Anton']},
    {'old': 'Geschenke:Isabella', 'new': 'Geschenke', tags: ['Isabella']},
    {'old': 'Geschenke:Manuel', 'new': 'Geschenke', tags: ['Manuel']},
    {'old': 'Geschenke:Martina Geschenke', 'new': 'Geschenke', tags: ['Martina']},
    {'old': 'AUSGABEN:Gesundheit', 'new': 'Gesundheit & Pflege'},
    {
      'old': 'Arzt- und Gesundheitskosten:Gesundheit - Selbstzahler - Anton',
      'new': 'Gesundheit & Pflege', tags: ['Anton'],
    },
    {
      'old': 'Arzt- und Gesundheitskosten:Gesundheit - Selbstzahler - Martina',
      'new': 'Gesundheit & Pflege', tags: ['Martina'],
    },
    {
      'old': 'Arzt- und Gesundheitskosten:Gesundheit - Zuzahlung - Anton',
      'new': 'Gesundheit & Pflege', tags: ['Anton'],
    },
    {
      'old': 'Arzt- und Gesundheitskosten:Gesundheit - Zuzahlung - Martina',
      'new': 'Gesundheit & Pflege', tags: ['Martina'],
    },
    {'old': 'AUSGABEN:Haus & Hof', 'new': 'Haus & Garten'},
    {'old': 'Haus & Hof:Garten', 'new': 'Haus & Garten'},
    {'old': 'Haus & Hof:Hasen', 'new': 'Haus & Garten', tags: ['Hasen']},
    {'old': 'Haus & Hof:Laufende Kosten', 'new': 'Haus & Garten'},
    {'old': 'Haus & Hof:Pflege', 'new': 'Haus & Garten'},
    {'old': 'Haus & Hof:Reperaturen', 'new': 'Haus & Garten', tags: ['Reparaturen']},
    {'old': 'Haus & Hof:Umbau Hausbus', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Hausbus Umbau']},
    {'old': 'Haus & Hof:Umbau/Ausbau', 'new': 'Reparaturen, Renovierung & Hausbau'},
    {'old': 'AUSGABEN:Hausbau', 'new': 'Reparaturen, Renovierung & Hausbau'},
    {'old': 'Hausbau:Abbruch', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Abbruch']},
    {'old': 'Hausbau:Altbau', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Altbau']},
    {'old': 'Hausbau:Außenanlage', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Außenanlage']},
    {'old': 'Hausbau:Bauantrag', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Bauantrag']},
    {'old': 'Hausbau:Dach', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Dach']},
    {'old': 'Hausbau:Einrichtung - Küche', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Einrichtung']},
    {'old': 'Hausbau:Elektroinstallation', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Elektroinstallation']},
    {
      'old': 'Hausbau:Heizung, Wasser + Sanitär',
      'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Heizung, Wasser, Sanitär'],
    },
    {'old': 'Hausbau:Innenausbau', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Innenausbau']},
    {'old': 'Hausbau:Literatur', 'new': 'Reparaturen, Renovierung & Hausbau'},
    {'old': 'Hausbau:Rohbau', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Rohbau']},
    {
      'old': 'Hausbau:Türen, Fenster, Rollladen,Treppe',
      'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Türen, Fenster, Rollladen,Treppe'],
    },
    {'old': 'AUSGABEN:Haushalt', 'new': 'Haushalt'},
    {'old': 'Haushalt:Büromaterial', 'new': 'Haushalt'},
    {'old': 'Haushalt:Deko', 'new': 'Einrichtung & Deko'},
    {'old': 'Haushalt:Drogerieartikel', 'new': 'Haushalt'},
    {'old': 'Haushalt:Einrichtung', 'new': 'Einrichtung & Deko'},
    {'old': 'Haushalt:Küche', 'new': 'Haushalt', tags: ['Küche']},
    {'old': 'Haushalt:Reparaturen', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['Haushalt']},
    {'old': 'Haushalt:Verbrauchsmaterialien', 'new': 'Haushalt'},
    {
      'old': 'Haushalt:Werkzeug, Maschinen, etc.',
      'new': 'Haushalt', tags: ['Werkzeug & Maschinen'],
    },
    {'old': 'AUSGABEN:Kleidung', 'new': 'Kleidung & Mode'},
    {'old': 'Isabella Kleidung', 'new': 'Kleidung & Mode', tags: ['Isabella']},
    {'old': 'Kleidung:Anton Friseur', 'new': 'Kleidung & Mode', tags: ['Anton', 'Friseur']},
    {'old': 'Kleidung:Anton Kleidung', 'new': 'Kleidung & Mode', tags: ['Anton']},
    {'old': 'Kleidung:Martina Kleidung', 'new': 'Kleidung & Mode', tags: ['Martina']},
    {'old': 'AUSGABEN:Laufende Ausgaben', 'new': 'Fixkosten & Verträge'},
    {'old': 'Laufende Ausgaben:Miete', 'new': 'Fixkosten & Verträge', tags: ['Miete']},
    {
      'old': 'Laufende Ausgaben:Rundfunkgebühren',
      'new': 'Fixkosten & Verträge', tags: ['Rundfunkgebühren'],
    },
    {'old': 'Laufende Ausgaben:Strom', 'new': 'Fixkosten & Verträge', tags: ['Strom']},
    {'old': 'Laufende Ausgaben:Telefon', 'new': 'Fixkosten & Verträge', tags: ['Telefon & Internet']},
    {
      'old': 'Laufende Ausgaben:Wasser und Kanalgebühren',
      'new': 'Fixkosten & Verträge', tags: ['Wasser und Kanalgebühren'],
    },
    {'old': 'AUSGABEN:Mobilität', 'new': 'Mobilität & Transport'},
    {'old': 'Mobilität:Cloud Dienste', 'new': 'Mobilität & Transport', tags: ['Cloud Dienste']},
    {'old': 'Mobilität:Fahrrad Anschaffung', 'new': 'Mobilität & Transport', tags: ['Fahrrad']},
    {'old': 'Mobilität:Fahrrad Zubehör', 'new': 'Mobilität & Transport', tags: ['Fahrrad']},
    {'old': 'Mobilität:KFZ Anschaffung', 'new': 'Mobilität & Transport', tags: ['KFZ']},
    {'old': 'Mobilität:KFZ Laden', 'new': 'Mobilität & Transport', tags: ['KFZ', 'Strom']},
    {'old': 'Mobilität:KFZ Steuer', 'new': 'Steuern', tags: ['KFZ']},
    {'old': 'Mobilität:KFZ Versicherung', 'new': 'Versicherungen', tags: ['KFZ']},
    {'old': 'Mobilität:KFZ Wartung', 'new': 'Reparaturen, Renovierung & Hausbau', tags: ['KFZ']},
    {'old': 'Mobilität:Kraftstoff', 'new': 'Mobilität & Transport', tags: ['KFZ', 'Kraftstoff']},
    {'old': 'AUSGABEN:Reise', 'new': 'Reisen & Urlaub'},
    {'old': 'Reise:2005 Andalusien', 'new': 'Reisen & Urlaub', tags: ['2005 Andalusien']},
    {'old': 'Reise:2005 Andalusien - Isla Canela', 'new': 'Reisen & Urlaub', tags: ['2005 Andalusien']},
    {'old': 'Reise:2010 Köln', 'new': 'Reisen & Urlaub', tags: ['2010 Köln']},
    {'old': 'Reise:2011 Köln', 'new': 'Reisen & Urlaub', tags: ['2010 Köln']},
    {'old': 'Reise:2012 Buchau', 'new': 'Reisen & Urlaub', tags: ['2012 Buchau']},
    {'old': 'Reise:2012 Köln', 'new': 'Reisen & Urlaub', tags: ['2012 Köln']},
    {'old': 'Reise:2012 Unken', 'new': 'Reisen & Urlaub', tags: ['2012 Unken']},
    {'old': 'Reise:2013 Buchau', 'new': 'Reisen & Urlaub', tags: ['2013 Buchau']},
    {'old': 'Reise:2013 Köln', 'new': 'Reisen & Urlaub', tags: ['2013 Köln']},
    {'old': 'Reise:2013 Meersburg', 'new': 'Reisen & Urlaub', tags: ['2013 Meersburg']},
    {'old': 'Reise:2014 Bayerisch Gmain', 'new': 'Reisen & Urlaub', tags: ['2014 Bayerisch Gmain']},
    {'old': 'Reise:2014 Köln', 'new': 'Reisen & Urlaub', tags: ['2014 Köln']},
    {'old': 'Reise:2014 Südtirol', 'new': 'Reisen & Urlaub', tags: ['2014 Südtirol']},
    {'old': 'Reise:2015 Buchau', 'new': 'Reisen & Urlaub', tags: ['2015 Buchau']},
    {'old': 'Reise:2015 Köln', 'new': 'Reisen & Urlaub', tags: ['2015 Köln']},
    {'old': 'Reise:2015 Oberjoch', 'new': 'Reisen & Urlaub', tags: ['2015 Oberjoch']},
    {'old': 'Reise:2015 Südtirol', 'new': 'Reisen & Urlaub', tags: ['2015 Südtirol']},
    {'old': 'Reise:2015 Unken', 'new': 'Reisen & Urlaub', tags: ['2015 Unken']},
    {'old': 'Reise:2016 Buchau', 'new': 'Reisen & Urlaub', tags: ['2016 Buchau']},
    {'old': 'Reise:2016 Caorle', 'new': 'Reisen & Urlaub', tags: ['2016 Caorle']},
    {'old': 'Reise:2016 Hexenwasser', 'new': 'Reisen & Urlaub', tags: ['2016 Hexenwasser']},
    {'old': 'Reise:2016 Köln', 'new': 'Reisen & Urlaub', tags: ['2016 Köln']},
    {'old': 'Reise:2017 AIDA', 'new': 'Reisen & Urlaub', tags: ['2017 AIDA']},
    {'old': 'Reise:2017 Caorle', 'new': 'Reisen & Urlaub', tags: ['2017 Caorle']},
    {'old': 'Reise:2017 Gardasee', 'new': 'Reisen & Urlaub', tags: ['2017 Gardasee']},
    {'old': 'Reise:2018 AIDA', 'new': 'Reisen & Urlaub', tags: ['2018 AIDA']},
    {'old': 'Reise:2018 Köln', 'new': 'Reisen & Urlaub', tags: ['2018 Köln']},
    {'old': 'Reise:2018 London', 'new': 'Reisen & Urlaub', tags: ['2018 London']},
    {'old': 'Reise:2018 Südtirol', 'new': 'Reisen & Urlaub', tags: ['2018 Südtirol']},
    {'old': 'Reise:2019 AIDA', 'new': 'Reisen & Urlaub', tags: ['2019 AIDA']},
    {'old': 'Reise:2019 Truyenhof', 'new': 'Reisen & Urlaub', tags: ['2019 Truyenhof']},
    {'old': 'Reise:2021 Caorle', 'new': 'Reisen & Urlaub', tags: ['2021 Caorle']},
    {'old': 'Reise:2022 AIDA', 'new': 'Reisen & Urlaub', tags: ['2022 AIDA']},
    {'old': 'Reise:2022 Bad Kleinkirchheim', 'new': 'Reisen & Urlaub', tags: ['2022 Bad Kleinkirchheim']},
    {'old': 'Reise:2022 Caorle', 'new': 'Reisen & Urlaub', tags: ['2022 Caorle']},
    {'old': 'Reise:2022 Mailand', 'new': 'Reisen & Urlaub', tags: ['2022 Mailand']},
    {'old': 'Reise:2023 AIDA', 'new': 'Reisen & Urlaub', tags: ['2023 AIDA']},
    {'old': 'Reise:2023 Paris', 'new': 'Reisen & Urlaub', tags: ['2023 Paris']},
    {'old': 'Reise:2023 Toskana', 'new': 'Reisen & Urlaub', tags: ['2023 Toskana']},
    {'old': 'Reise:Dienstreise Anton', 'new': 'Reisen & Urlaub', tags: ['Dienstreise Anton']},
    {'old': 'Reise:Krankenhaus Murnau', 'new': 'Sonstiges'},
    {'old': 'AUSGABEN:Sonderausgaben', 'new': 'Sonstiges'},
    {'old': 'Sonderausgaben:Austrag', 'new': 'Familie & Unterstützung', tags: ['Eltern', 'Austrag']},
    {'old': 'Sonderausgaben:Übergabe', 'new': 'Familie & Unterstützung', tags: ['Eltern', 'Hofübergabe']},
    {'old': 'AUSGABEN:Sonstige Ausgaben', 'new': 'Sonstiges'},
    {'old': 'Sonstige Ausgaben:Bankgebühren', 'new': 'Bank & Finanzen', tags: ['Bankgebühren']},
    {'old': 'Sonstige Ausgaben:Bargeld Martina', 'new': 'Sonstiges', tags: ['Bargeld Martina']},
    {'old': 'Sonstige Ausgaben:Durchlaufende Posten', 'new': 'Sonstiges'},
    {'old': 'Sonstige Ausgaben:Gebühren (sonstige)', 'new': 'Sonstiges', tags: ['Gebühren']},
    {'old': 'Sonstige Ausgaben:Parkgebühren', 'new': 'Mobilität & Transport', tags: ['Parken']},
    {'old': 'Sonstige Ausgaben:Porto', 'new': 'Sonstiges', tags: ['Porto']},
    {'old': 'Sonstige Ausgaben:Porto Martina', 'new': 'Sonstiges', tags: ['Porto Martina']},
    {'old': 'Sonstige Ausgaben:ausgelegt für CSU Merching', 'new': 'Sonstiges', tags: ['ausgelegt für CSU Merching']},
    {'old': 'Sonstige Ausgaben:ausgelegt für Feuerwehr', 'new': 'Sonstiges', tags: ['ausgelegt für Feuerwehr']},
    {
      'old': 'Sonstige Ausgaben:ausgelegt für Isabella',
      'new': 'Sonstiges', tags: ['ausgelegt für Isabella'],
    },
    {'old': 'Sonstige Ausgaben:ausgelegt für Manuel', 'new': 'Sonstiges', tags: ['ausgelegt für Manuel']},
    {
      'old': 'Sonstige Ausgaben:Öffentliche Verkehrsmittel',
      'new': 'Mobilität & Transport', tags: ['ÖPNV'],
    },
    {
      'old': 'Sonstige Einkünfte:Durchlaufende Posten',
      'new': 'Sonstige Einnahmen',
    },
    {'old': 'Sonstige Einkünfte:Elterngeld', 'new': 'Staatliche Zuschüsse', tags: ['Elterngeld']},
    {'old': 'Sonstige Einkünfte:Erhaltene Geschenke', 'new': 'Geschenke'},
    {
      'old': 'Sonstige Einkünfte:Erstattung Arztkosten',
      'new': 'Gesundheit & Pflege – Erstattungen', tags: [],
    },
    {'old': 'Sonstige Einkünfte:Erstattung Reisekosten', 'new': 'Lohn & Gehalt', tags: ['Reisekostenerstattung']},
    {
      'old': 'Sonstige Einkünfte:Erstattung ausgelegt für Kids',
      'new': 'Kinder allgemein',
    },
    {'old': 'Sonstige Einkünfte:Kindergeld', 'new': 'Staatliche Zuschüsse', tags: ['Kindergeld']},
    {'old': 'AUSGABEN:Steuern', 'new': 'Steuern'},
    {'old': 'Steuern:Abgeltungssteuer', 'new': 'Steuern', tags: ['Abgeltungssteuer', 'Kapital']},
    {'old': 'Steuern:Grundsteuer', 'new': 'Steuern', tags: ['Grundsteuer B', 'Bahnhofstr. 10a']},
    {'old': 'Steuern:Grundsteuer A (Landw.)', 'new': 'Steuern', tags: ['Grundsteuer A', 'Landwirtschaft']},
    {'old': 'Steuern:Grundsteuer B (Bahnhofstr. 10)', 'new': 'Steuern', tags: ['Grundsteuer B', 'Bahnhofstr. 10']},
    {'old': 'Steuern:Kapitalertragsteuer', 'new': 'Steuern', tags: ['Kapital']},
    {'old': 'Steuern:Kapitalertragsteuer Isabella', 'new': 'Steuern', tags: ['Kapital', 'Isabella']},
    {'old': 'Steuern:Kapitalertragsteuer Manuel', 'new': 'Steuern', tags: ['Kapital', 'Manuel']},
    {'old': 'Steuern:Kirchensteuer', 'new': 'Steuern', tags: ['Kirchensteuer']},
    {'old': 'Steuern:Solidaritätszuschlag', 'new': 'Steuern', tags: ['Solidaritätszuschlag']},
    {'old': 'Steuern:Solidaritätszuschlag Isabella', 'new': 'Steuern', tags: ['Solidaritätszuschlag', 'Isabella']},
    {'old': 'Steuern:Umsatzsteuer PV', 'new': 'Steuern', tags: ['PV']},
    {'old': 'Steuern:Zinsabschlagsteuer', 'new': 'Steuern', tags: ['Kapital', 'Zinsabschlagsteuer']},
    {'old': 'USA:us_Bank', 'new': 'Bank & Finanzen', tags: ['USA-Aufenthalt']},
    {'old': 'USA:us_Deposit', 'new': 'Bank & Finanzen', tags: ['USA-Aufenthalt']},
    {'old': 'USA:us_Essen', 'new': 'Lebensmittel & Verpflegung', tags: ['USA-Aufenthalt']},
    {'old': 'USA:us_Essen_Anton_Mittag', 'new': 'Lebensmittel & Verpflegung', tags: ['USA-Aufenthalt', 'Anton Arbeit']},
    {'old': 'USA:us_Haushalt', 'new': 'Haushalt', tags: ['USA-Aufenthalt']},
    {'old': 'USA:us_Miete', 'new': 'Fixkosten & Verträge', tags: ['USA-Aufenthalt', 'Miete']},
    {'old': 'USA:us_Spesen_IXOS', 'new': 'Reisen & Urlaub', tags: ['USA-Aufenthalt', 'Dienstreise', 'Spesen']},
    {'old': 'USA:us_Strom', 'new': 'Fixkosten & Verträge', tags: ['USA-Aufenthalt','Strom']},
    {'old': 'USA:us_Tanken', 'new': 'Mobilität & Transport', tags: ['USA-Aufenthalt', 'KFZ', 'Kraftstoff']},
    {'old': 'USA:us_Toll', 'new': 'Mobilität & Transport', tags: ['USA-Aufenthalt', 'Maut']},
    {'old': 'USA:us_v_Eintritt', 'new': 'Freizeit & Hobby', tags: ['USA-Aufenthalt', 'Eintritt']},
    {'old': 'USA:us_v_Essen', 'new': 'Restaurant', tags: ['USA-Aufenthalt']},
    {'old': 'USA:us_v_Haushalt', 'new': 'Haushalt', tags: ['USA-Aufenthalt']},
    {'old': 'USA:us_v_Internet_Fernsehen', 'new': 'ixkosten & Verträge', tags: ['USA-Aufenthalt', 'Telefon & Internet']},
    {'old': 'USA:us_v_Telefon', 'new': 'Fixkosten & Verträge', tags: ['USA-Aufenthalt', 'Telefon & Internet']},
    {'old': 'USA:us_öffentl. Verkehr', 'new': 'Mobilität & Transport', tags: ['USA-Aufenthalt', 'ÖPNV']},
    {'old': 'Umbuchung', 'new': 'Umbuchungen'},
    {'old': 'Umbuchung:ADAC Kreditkarte', 'new': 'Umbuchungen', transferAccount: 'ADAC Kreditkarte'},
    {'old': 'Umbuchung:Bargeld', 'new': 'Umbuchungen', transferAccount: 'Bargeld'},
    {'old': 'Umbuchung:Berliner Bank Kreditkartenkonto', 'new': 'Umbuchungen', transferAccount: 'Berliner Bank Kreditkartenkonto'},
    {'old': 'Umbuchung:Cortal Consors Tagesgeldkonto', 'new': 'Umbuchungen', transferAccount: 'Cortal Consors Tagesgeldkonto'},
    {'old': 'Umbuchung:Cortal Consors Verrechnungskonto', 'new': 'Umbuchungen', transferAccount: 'Cortal Consors Verrechnungskonto'},
    {'old': 'Umbuchung:Geldkarte', 'new': 'Umbuchungen', transferAccount: 'Geldkarte'},
    {'old': 'Umbuchung:IngDiba Extrakonto Anton', 'new': 'Umbuchungen', transferAccount: 'IngDiba Extrakonto Anton'},
    {'old': 'Umbuchung:Isabella Festgeld INGDiba', 'new': 'Umbuchungen', transferAccount: 'Isabella Festgeld INGDiba'},
    {'old': 'Umbuchung:Isabella Sparbuch', 'new': 'Umbuchungen', transferAccount: 'Isabella Sparbuch'},
    {'old': 'Umbuchung:Manuel Festgeld INGDiba', 'new': 'Umbuchungen', transferAccount: 'Maneral Festgeld INGDiba'},
    {'old': 'Umbuchung:Netbank Tagesgeldkonto', 'new': 'Umbuchungen', transferAccount: 'Netbank Tagesgeldkonto'},
    {'old': 'Umbuchung:Netbank Verrechnungskonto', 'new': 'Umbuchungen', transferAccount: 'Netbank Verrechnungskonto'},
    {'old': 'Umbuchung:Targobank', 'new': 'Umbuchungen', transferAccount: 'Targobank'},
    {'old': 'Umbuchung:auf Bargeld Martina', 'new': 'Umbuchungen', transferAccount: 'Bargeld Martina'},
    {'old': 'Umbuchung:auf Boon Kreditkarte', 'new': 'Umbuchungen', transferAccount: 'Boon Kreditkarte'},
    {
      'old': 'Umbuchung:auf Cortal Consors Tagesgeldkonto',
      'new': 'Umbuchungen', transferAccount: 'Cortal Consors Tagesgeldkonto',
    },
    {
      'old': 'Umbuchung:auf Cortal Consors Verrechnungskonto',
      'new': 'Umbuchungen', transferAccount: 'Cortal Consors Verrechnungskonto',
    },
    {'old': 'Umbuchung:auf DKB Martina', 'new': 'Umbuchungen', transferAccount: 'DKB Martina'},
    {'old': 'Umbuchung:auf Girokonto Anton', 'new': 'Umbuchungen', transferAccount: 'Girokonto Anton'},
    {'old': 'Umbuchung:auf IngDiba Extrakonto Anton', 'new': 'Umbuchungen', transferAccount: 'IngDiba Extrakonto Anton'},
    {'old': 'Umbuchung:auf IngDiba Extrakonto Manuel', 'new': 'Umbuchungen', transferAccount: 'IngDiba Extrakonto Manuel'},
    {'old': 'Umbuchung:auf IngDiba Extrakonto Martina', 'new': 'Umbuchungen', transferAccount: 'IngDiba Extrakonto Martina'},
    {'old': 'Umbuchung:auf Isabella Festgeld INGDiba', 'new': 'Umbuchungen', transferAccount: 'Isabella Festgeld INGDiba'},
    {'old': 'Umbuchung:auf Manuel Festgeld INGDiba', 'new': 'Umbuchungen', transferAccount: 'Maneral Festgeld INGDiba'},
    {'old': 'Umbuchung:auf N26', 'new': 'Umbuchungen', transferAccount: 'N26'},
    {'old': 'Umbuchung:auf Netbank Girokonto', 'new': 'Umbuchungen', transferAccount: 'Netbank Girokonto'},
    {'old': 'Umbuchung:auf Netbank Sparbrief', 'new': 'Umbuchungen', transferAccount: 'Netbank Sparbrief'},
    {'old': 'Umbuchung:auf Netbank Tagesgeldkonto', 'new': 'Umbuchungen', transferAccount: 'Netbank Tagesgeldkonto'},
    {'old': 'Umbuchung:auf comdirect Anton Giro', 'new': 'Umbuchungen', transferAccount: 'comdirect Anton Giro'},
    {'old': 'Umbuchung:auf comdirect Anton Kreditkarte', 'new': 'Umbuchungen', transferAccount: 'comdirect Anton Kreditkarte'},
    {'old': 'Umbuchung:auf comdirect Martina Giro', 'new': 'Umbuchungen', transferAccount: 'comdirect Martina Giro'},
    {
      'old': 'Umbuchung:auf comdirect Martina Kreditkarte',
      'new': 'Umbuchungen', transferAccount: 'comdirect Martina Kreditkarte',
    },
    {'old': 'Umbuchung:auf comdirect Tagesgeld', 'new': 'Umbuchungen', transferAccount: 'comdirect Tagesgeld'},
    {'old': 'Umbuchung:von Bargeld Martina', 'new': 'Umbuchungen', transferAccount: 'Bargeld Martina'},
    {'old': 'Umbuchung:von Girokonto Anton', 'new': 'Umbuchungen', transferAccount: 'Girokonto Anton'},
    {'old': 'Umbuchung:von IngDiba Extrakonto Isabella', 'new': 'Umbuchungen', transferAccount: 'IngDiba Extrakonto Isabella'},
    {'old': 'Umbuchung:von IngDiba Extrakonto Manuel', 'new': 'Umbuchungen', transferAccount: 'IngDiba Extrakonto Manuel'},
    {'old': 'Umbuchung:von IngDiba Martina', 'new': 'Umbuchungen', transferAccount: 'IngDiba Martina'},
    {'old': 'Umbuchung:von IngDiba Martina Festgeld', 'new': 'Umbuchungen', transferAccount: 'IngDiba Martina Festgeld'},
    {'old': 'Umbuchung:von Targobank', 'new': 'Umbuchungen', transferAccount: 'Targobank'},
    {'old': 'Umbuchung:von comdirect Anton Giro', 'new': 'Umbuchungen', transferAccount: 'comdirect Anton Giro'},
    {'old': 'Umbuchung:von comdirect Giro', 'new': 'Umbuchungen', transferAccount: 'comdirect Anton Giro'},
    {'old': 'Umbuchung:von comdirect Tagesgeld', 'new': 'Umbuchungen', transferAccount: 'comdirect Tagesgeld'},
    {'old': 'Verschiedenes Anton:Druchlaufende Posten', 'new': 'Sonstiges', tags: ['Anton']},
    {'old': 'Verschiedenes Martina:Sonstiges', 'new': 'Sonstiges', tags: ['Martina']},
    {
      'old': 'Verschiedenes Martina:Verzichtbar',
      'new': 'Verzichtbare Ausgaben', tags: ['Martina', 'verzichtbar'],
    },
    {'old': 'Verzichtbar:Android Apps', 'new': 'Computer', tags: ['verzichtbar', 'Android Apps']},
    {'old': 'Verzichtbar:Computer', 'new': 'Computer', tags: ['verzichtbar']},
    {'old': 'Verzichtbar:Computer - NAS', 'new': 'Computer', tags: ['verzichtbar', 'NAS']},
    {
      'old': 'Verzichtbar:Computer Cloud Dienste',
      'new': 'Computer', tags: ['verzichtbar', 'Cloud Dienste'],
    },
    {
      'old': 'Verzichtbar:Computer Development Tools',
      'new': 'Computer', tags: ['verzichtbar', 'Development Tools'],
    },
    {
      'old': 'Verzichtbar:Computer Verbrauchsmaterial',
      'new': 'Computer', tags: ['verzichtbar', 'Verbrauchsmaterial'],
    },
    {'old': 'Verzichtbar:Elektronik', 'new': 'Freizeit & Hobby', tags: ['verzichtbar', 'Elektronik']},
    {'old': 'Verzichtbar:Glücksspiel', 'new': 'Freizeit & Hobby', tags: ['verzichtbar', 'Glücksspiel']},
    {'old': 'Verzichtbar:Hobbies', 'new': 'Freizeit & Hobby'},
    {'old': 'Versicherung:Auto', 'new': 'Mobilität & Transport', tags: ['KFZ', 'Versicherung']},
    {'old': 'AUSGABEN:Verschiedenes Anton', 'new': 'Sonstiges', tags: ['Anton']},
  ];

  const mappings = {};
  catMappings.forEach(mapping => {
    mappings[mapping.old] = { category: mapping.new, tags: mapping.tags, transferAccount: mapping.transferAccount };
  });
  return mappings;
}

exportData().then(() => {
  console.log('Export finished');
}).catch((reason) => {
  console.log(reason);
});

import {AsExpress} from 'as-express';
import dbSchema from './dbSchema.js';
import yaml from 'js-yaml';
import fs from 'fs';
import _ from 'lodash';
import knex from 'knex';
import { DateTime } from 'luxon';

export default async function importData(importFilename, db) {
  const promises = [];
  const closedDate = DateTime.fromISO('2100-12-01');
  const data = yaml.load(fs.readFileSync(importFilename, 'utf8'));
  console.log('Importing Accounts...');
  for (const resultElement of data.accounts) {
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

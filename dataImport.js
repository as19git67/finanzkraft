import yaml from 'js-yaml';
import fs from 'fs';
import { DateTime } from 'luxon';

export default async function importData(db, importFilename) {
  const closedDate = DateTime.fromISO('2100-12-01');
  const data = yaml.load(fs.readFileSync(importFilename, 'utf8'));

  console.log('Importing Accounts...');
  for (const account of data.accounts) {
    const id = await db.addAccount({
      name: account.name,
      iban: account.iban,
      number: account.number,
      idCurrency: account.idCurrency,
      startBalance: account.startBalance,
      closedAt: account.closedAt,
    });
    console.log(`Account with id ${id[0].id} inserted`);
  }
  console.log('Imported Accounts');

}

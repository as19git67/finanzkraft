import yaml from 'js-yaml';
import fs from 'fs';
import { DateTime } from 'luxon';

export default async function importData(db, importFilename) {
  const closedDate = DateTime.fromISO('2100-12-01');
  const data = yaml.load(fs.readFileSync(importFilename, 'utf8'));

  console.log('Importing accounts...');
  const accountIdByName = {};
  for (const account of data.accounts) {
    const id = await db.addAccount({
      name: account.name,
      iban: account.iban,
      number: account.number,
      idCurrency: account.idCurrency,
      startBalance: account.startBalance,
      closedAt: account.closedAt,
    });
    accountIdByName[account.name] = id;
  }
  console.log(`Imported ${Object.keys(data.accounts).length} accounts`);

  console.log(`Importing ${Object.keys(data.transactions).length} transactions...`);
  for (const tr of data.transactions) {
    const idAccount = accountIdByName[tr.account_name];
    const idCategory = tr.category === null ? undefined : await db.getOrCreateCategory(tr.category);
    const id = await db.addTransaction({
      idAccount: idAccount,
      valueDate: tr.t_valueDate,
      amount: tr.t_amount,
      text: tr.t_text,
      payee: tr.payee,
      idCategory: idCategory,
    });
  }
  console.log(`Imported ${Object.keys(data.transactions).length} transactions`);

}

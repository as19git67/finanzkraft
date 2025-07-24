import yaml from 'js-yaml';
import fs from 'fs';

export default async function importData(db, importFilename) {
  const result = await db.getAccounts();
  if (result.length > 0) {
    console.log('Database has already data stored. Skip importing initial data.');
    return;
  }

  const data = yaml.load(fs.readFileSync(importFilename, 'utf8'));

  console.log(`Importing accounts from ${importFilename}...`);
  const accountIdByName = {};
  for (const account of data.accounts) {
    console.log(`Importing account ${account.name}...`);
    const id = await db.addAccount({
      name: account.name,
      iban: account.iban,
      number: account.number === '0' ? undefined : account.number,
      idCurrency: account.currency_id ? account.currency_id : account.idCurrency,
      idAccountType: account.account_type_id === undefined ? 'checking' : account.account_type_id,
      startBalance: account.startBalance,
      closedAt: account.closedAt,
    });
    accountIdByName[account.name] = id;
  }
  console.log(`Imported ${Object.keys(data.accounts).length} accounts`);

  console.log(`Importing ${Object.keys(data.transactions).length} transactions...`);
  const balanceByDate = {};
  const maxTr = 100000;
  let cnt = 0;

  // first round: fix duplicate balances
  for (const tr of data.transactions) {
    if (cnt > maxTr) break;
    const idAccount = accountIdByName[tr.account_name];
    const balance = {};
    if (tr.bal_saldo !== null) {
      balance.idAccount = idAccount;
      balance.balance = tr.bal_saldo;
      balance.balanceDate = tr.t_valueDate;
      balanceByDate[`${idAccount}:${tr.t_valueDate}`] = {balance, idTr: tr.t_id};
    }
  }

  for (const tr of data.transactions) {
    if (cnt > maxTr) break;
    const idAccount = accountIdByName[tr.account_name];
    const isCash = tr.account_name.indexOf('Bargeld') >= 0;
    const idCategory = tr.category === null ? undefined : await db.getOrCreateCategory(tr.category);
    let cachedBalance = balanceByDate[`${idAccount}:${tr.t_valueDate}`];
    if (cachedBalance && cachedBalance.idTr === tr.t_id) {
      cachedBalance = cachedBalance.balance;
      // console.log(`Have balance of ${balance.balance} from transaction ${tr.t_id}`);
    } else {
      cachedBalance = undefined;
    }
    const tagIds = tr.tags ? await db.getOrCreateTags(tr.tags) : undefined;
    const id = await db.addTransaction({
        idAccount: idAccount,
        valueDate: tr.t_valueDate,
        amount: tr.t_amount,
        text: isCash ? null : tr.t_text,
        payee: tr.payee,
        entryText: tr.t_type,
        primaNotaNo: tr.t_prima_nota_no,
        gvCode: tr.t_zka_tr_code,
        processed: true,
        idCategory: idCategory,
        oldCategory: tr.orig_category,
        notes: isCash ? tr.t_text : null,
      },
      {
        tags: tagIds,
        balance: cachedBalance,
        ignoreRules: true,
      }
    );
    cnt++;
  }
  console.log(`Imported ${Object.keys(data.transactions).length} transactions`);
}

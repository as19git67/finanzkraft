import AsRouteConfig from '../as-router.js';
import config from '../config.js';
import FinTS from '../fints.js';
import {DateTime} from 'luxon';

const rc = new AsRouteConfig('/:idAccount/statements');

function isEqual(tr, key, sTr) {
  if (tr[key]) {
    return tr[key] === sTr['t_' + key];
  } else {
    return true;
  }
}

async function transactionExists(db, tra) {
  const fixedTr = db._fixTransactionData(tra);
  const from = DateTime.fromJSDate(tra.valueDate).minus({days: 5}).toISO();
  const to = DateTime.fromJSDate(tra.valueDate).plus({days: 2}).toISO();
  const savedTr = await db.getTransactions(50, fixedTr.text, [tra.idAccount], from, to);
  // search transaction in saved transactions and add the new transaction only if it was not found
  const filteredTransactions = savedTr.filter((sTr) => {
    if (fixedTr.text && fixedTr.text.trim()) {
      if (fixedTr.text.trim() !== sTr.t_text?.trim()) {
        return false;
      }
    }
    if (!isEqual(fixedTr, 'REF', sTr)) return false;
    if (!isEqual(fixedTr, 'EREF', sTr)) return false;
    if (!isEqual(fixedTr, 'CRED', sTr)) return false;
    if (!isEqual(fixedTr, 'MREF', sTr)) return false;
    if (!isEqual(fixedTr, 'ABWA', sTr)) return false;
    if (!isEqual(fixedTr, 'ABWE', sTr)) return false;
    if (!isEqual(fixedTr, 'IBAN', sTr)) return false;
    if (!isEqual(fixedTr, 'BIC', sTr)) return false;

    if (fixedTr.entryText && fixedTr.entryText.trim()) {
      if (fixedTr.entryText.trim() !== sTr.t_entry_text?.trim()) {
        return false;
      }
    }
    if (fixedTr.payeePayerAcctNo && fixedTr.payeePayerAcctNo.trim()) {
      if (fixedTr.payeePayerAcctNo.trim() !== sTr.t_payeePayerAcctNo?.trim()) {
        return false;
      }
    }
    if (fixedTr.gvCode && fixedTr.gvCode.trim()) {
      if (fixedTr.gvCode.trim() !== sTr.t_gvCode?.trim()) {
        return false;
      }
    }
    if (fixedTr.primaNotaNo && sTr.t_primaNotaNo) {
      const trPN = parseInt(fixedTr.primaNotaNo);
      const sTrPN = parseInt(sTr.t_primaNotaNo);
      if (trPN !== undefined && sTrPN !== undefined && trPN !== sTrPN) {
        return false;
      }
    }
    return fixedTr.amount === sTr.t_amount;
  });
  return filteredTransactions.length > 0;
}

rc.get(async function (req, res, next) {
  try {
    const {fintsProductId, fintsProductVersion} = config;
    if (!fintsProductId || !fintsProductVersion) {
      console.log(`Missing fintsProductId or fintsProductVersion in config`);
      res.sendStatus(500);
      return;
    }
    const idAccount = parseInt(req.params.idAccount);
    if (idAccount === undefined) {
      console.log(`idAccount parameter missing`);
      res.sendStatus(404);
      return;
    }
    const db = req.app.get('database');
    const account = await db.getAccount(idAccount);
    if (!account.idBankcontact) {
      console.log(`Account ID: ${idAccount} has no bankcontact`);
      res.sendStatus(404);
      return;
    }

    const bankcontact = await db.getBankcontact(account.idBankcontact);
    if (!bankcontact.fintsUrl || !bankcontact.fintsBankId || !bankcontact.fintsUserId || !bankcontact.fintsPassword) {
      console.log(`Incomplete bankcontact configuration for bankcontact ${account.idBankcontact}`);
      res.sendStatus(500);
      return;
    }

    try {
      console.log(`Synchronizing bankcontact ${account.idBankcontact}: ${account.name}`);
      const transactions = await db.getTransactions(20, undefined, [idAccount]);
      let fromDate = DateTime.now().minus({days: 82});
      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        const tDate = DateTime.fromISO(t.t_value_date);
        if (tDate > fromDate) {
          fromDate = tDate;
        }
      }
      fromDate = fromDate.minus({days: 7}).toJSDate();

      const fints = new FinTS(fintsProductId, fintsProductVersion);
      const result = await fints.synchronize(bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword);
      if (!result.success) {
        console.log(`Failed to synchronize bankcontact ${account.idBankcontact}`);
        for (let j = 0; j < result.bankAnswers.length; j++) {
          console.log(`Bank answers: ${result.bankAnswers[j].code} ${result.bankAnswers[j].text}`);
        }
        await db.updateAccount(idAccount, {fintsError: 'Fehler bei der FinTS Synchronisierung'});
        res.json(result);
        return;
      }
      const statements = await fints.getStatements(account.fintsAccountNumber, fromDate);
      const downloadedTransactions = statements.transactions.map(tr => {
        return {
          idAccount: idAccount,
          ...tr,
        };
      });

      const transactionsToSave = [];
      const balance = {
        idAccount: idAccount,
        balanceDate: statements.balance.date,
        balance: statements.balance.balance,
      }
      for (let i = 0; i < downloadedTransactions.length && transactionsToSave.length < 50; i++) {
        const tra = downloadedTransactions[i];
        if (!(await transactionExists(db, tra))) {
          transactionsToSave.push(tra);
        }
      }
      if (transactionsToSave.length > 0) {
        const storedTransactions = await db.addTransactions(transactionsToSave, {balance, unconfirmed: true});
        console.log(`${storedTransactions.length} new transactions stored for account ID ${idAccount}`);
      }
      await db.updateAccount(idAccount, {fintsError: null});
      result.savedTransactions = transactionsToSave.length;
      result.balance = balance;
      res.json(result);
    } catch (ex) {
      console.log(ex);
      await db.updateAccount(idAccount, {fintsError: ex.message?.substring(0, 250)});
      res.sendStatus(500);
    }
  } catch (ex) {
    console.log(ex);
    res.sendStatus(500);
  }
});

export default rc;
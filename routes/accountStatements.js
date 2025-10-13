import AsRouteConfig from '../as-router.js';
import config from '../config.js';
import FinTS from '../fints.js';
import {DateTime} from 'luxon';

const rc = new AsRouteConfig('/:idAccount/statements');

rc.get(async function (req, res, next) {
  await handleRequest(req, res);
});

rc.post(async function (req, res, next) {
  const tanReference = req.body.tanReference;
  const tan = req.body.tan;
  if (tanReference === undefined) {
    console.log("Can't continue synchronization with no tanReference");
    res.sendStatus(404);
    return;
  }
  await handleRequest(req, res, tanReference, tan);
});

async function handleRequest(req, res, tanReference, tan) {
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

      let synchronizeResult;
      console.log(`Synchronizing bankcontact ${account.idBankcontact}: ${account.name}`);
      const fints = FinTS.from(fintsProductId, fintsProductVersion, false, bankcontact.fintsUrl, bankcontact.fintsBankId, bankcontact.fintsUserId, bankcontact.fintsPassword);
      if (tanReference) {
        console.log(`Synchronizing with tanReference ${tanReference}`);
        synchronizeResult = await fints.synchronizeWithTanReference(tanReference, tan);
      } else {
       synchronizeResult = await fints.synchronize();
      }
      const  {success, bankAnswers, tanInfo} = synchronizeResult;
      if (!success) {
        console.log(`Failed to synchronize bankcontact ${account.idBankcontact}`);
        for (let j = 0; j < bankAnswers.length; j++) {
          console.log(`Bank answers: ${bankAnswers[j].code} ${bankAnswers[j].text}`);
        }
        const pinOk = bankAnswers.find(bankAnswer => {
          return bankAnswer.code === 9910;
        }) === undefined;
        if (pinOk) {
          await db.updateAccount(idAccount, {fintsError: 'Fehler bei der FinTS Synchronisierung'});
        } else {
          console.log(`PIN WRONG for bankcontact ${idBankcontact} - resetting to empty password`);
          await db.updateBankcontact(idBankcontact, {fintsPassword: null, fintsActivated: false, fintsError: pinOk.message?.substring(0, 250)});
        }
        res.sendStatus(500);
        return;
      }

      if (tanInfo.requiresTan) {
        await db.updateAccount(idAccount, {fintsError: '', fintsAuthRequired: true});
        res.json({tanInfo, bankAccounts: [], bankAnswers: bankAnswers});
        return;
      }

      // todo: update account: fintsAuthRequired: false

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
        if (!(await db.transactionExists(tra))) {
          transactionsToSave.push(tra);
        }
      }
      if (transactionsToSave.length > 0) {
        const storedTransactions = await db.addTransactions(transactionsToSave, {balance, unconfirmed: true});
        console.log(`${storedTransactions.length} new transactions stored for account ID ${idAccount}`);
      }
      await db.updateAccount(idAccount, {fintsError: null});
      res.json({tanInfo, savedTransactions: transactionsToSave.length, balance: balance});
    } catch (ex) {
      console.log(ex);
      await db.updateAccount(idAccount, {fintsError: ex.message?.substring(0, 250)});
      res.sendStatus(500);
    }
  } catch (ex) {
    console.log(ex);
    res.sendStatus(500);
  }
}

export default rc;